/**
 * Shiprocket Webhook Handler
 * Receives real-time updates from Shiprocket about shipments
 * 
 * Events received:
 * - shipment.created
 * - shipment.picked
 * - shipment.shipped (in_transit)
 * - shipment.delivered
 * - shipment.cancelled
 * - shipment.failed
 */

import { connectToDatabase } from '@/lib/mongodb'

// Store SSE clients for real-time broadcast
const sseClients = new Map()

export async function POST(request) {
    try {
        const body = await request.json()
        
        console.log('[Shiprocket Webhook] Received event:', {
            event_type: body.event_type,
            order_id: body.data?.order_id,
            shipment_id: body.data?.shipment_id,
            awb_code: body.data?.awb_code,
            status: body.data?.status,
        })

        // Validate webhook (basic check)
        if (!body.event_type || !body.data) {
            return Response.json({
                success: false,
                message: 'Invalid webhook payload'
            }, { status: 400 })
        }

        // Connect to database
        const { db } = await connectToDatabase()
        const ordersCollection = db.collection('orders')

        // Extract data from webhook
        const {
            event_type,
            data: {
                order_id,
                shipment_id,
                awb_code,
                status,
                courier_name,
                estimated_delivery_date,
                tracking_url
            }
        } = body

        // Map Shiprocket status to our internal status
        const statusMap = {
            'created': 'pending',
            'picked': 'picked',
            'shipped': 'in_transit',
            'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered',
            'cancelled': 'cancelled',
            'failed': 'failed',
            'returned': 'returned',
            'undelivered': 'undelivered'
        }

        const mappedStatus = statusMap[status] || status

        // Find order by shiprocket_order_id
        const order = await ordersCollection.findOne({
            shiprocket_order_id: order_id.toString()
        })

        if (!order) {
            console.log('[Shiprocket Webhook] Order not found:', order_id)
            return Response.json({
                success: false,
                message: 'Order not found'
            }, { status: 404 })
        }

        // Update order with Shiprocket status
        const updateData = {
            shiprocket_status: mappedStatus,
            shiprocket_awb: awb_code || order.shiprocket_awb,
            shiprocket_courier: courier_name || order.shiprocket_courier,
            shiprocket_tracking_url: tracking_url,
            shiprocket_last_update: new Date(),
        }

        // Add estimated delivery date if provided
        if (estimated_delivery_date) {
            updateData.shiprocket_estimated_delivery = new Date(estimated_delivery_date)
        }

        // Update status based on event type
        if (mappedStatus === 'delivered') {
            updateData.status = 'delivered'
        } else if (mappedStatus === 'cancelled' || mappedStatus === 'failed') {
            updateData.status = 'cancelled'
        } else if (mappedStatus === 'in_transit') {
            updateData.status = 'shipped'
        }

        // Perform update
        const result = await ordersCollection.findOneAndUpdate(
            { shiprocket_order_id: order_id.toString() },
            { $set: updateData },
            { returnDocument: 'after' }
        )

        console.log('[Shiprocket Webhook] Order updated:', {
            orderId: order_id,
            newStatus: mappedStatus,
            AWB: awb_code
        })

        // Broadcast to store dashboard (SSE)
        broadcastToStore(order.storeId, {
            event: 'shipment_status_update',
            orderId: order._id.toString(),
            shipmentId: shipment_id,
            awb: awb_code,
            status: mappedStatus,
            courier: courier_name,
            estimatedDelivery: estimated_delivery_date,
            trackingUrl: tracking_url,
            timestamp: new Date()
        })

        // Send notification to customer (optional)
        await notifyCustomer(order, mappedStatus, awb_code, tracking_url)

        return Response.json({
            success: true,
            message: 'Webhook processed successfully',
            updatedOrder: {
                id: result.value._id,
                status: mappedStatus,
                awb: awb_code
            }
        }, { status: 200 })

    } catch (error) {
        console.error('[Shiprocket Webhook] Error:', error)
        return Response.json({
            success: false,
            message: 'Webhook processing failed',
            error: error.message
        }, { status: 500 })
    }
}

/**
 * Broadcast shipment update to store dashboard via SSE
 */
function broadcastToStore(storeId, data) {
    try {
        const clients = sseClients.get(storeId)
        if (!clients) return

        const message = `data: ${JSON.stringify(data)}\n\n`
        clients.forEach(response => {
            response.write(message)
        })
    } catch (error) {
        console.error('[Shiprocket Webhook] Broadcast error:', error)
    }
}

/**
 * Send notification to customer about shipment status
 */
async function notifyCustomer(order, status, awb, trackingUrl) {
    try {
        // You can implement SMS/Email notifications here
        // Example: Send email to order.address.email with tracking info
        
        const statusMessages = {
            'picked': `Your order is being picked. AWB: ${awb}`,
            'in_transit': `Your order is on the way! Track here: ${trackingUrl}`,
            'out_for_delivery': 'Your order is out for delivery today!',
            'delivered': 'Your order has been delivered!',
            'failed': 'Delivery attempt failed. Our team will contact you.',
            'cancelled': 'Your order has been cancelled.'
        }

        const message = statusMessages[status] || `Order status updated: ${status}`
        
        console.log('[Shiprocket Webhook] Customer notification:', {
            customer: order.address?.email,
            status: status,
            message: message,
            awb: awb
        })

        // TODO: Implement actual notification (email/SMS)
        // Example:
        // await sendEmail(order.address.email, `Order ${order.id} Update`, message)
        // await sendSMS(order.address.phone, message)

    } catch (error) {
        console.error('[Shiprocket Webhook] Notification error:', error)
        // Don't throw - webhook should succeed even if notification fails
    }
}

/**
 * SSE endpoint for store to receive real-time updates
 * GET /api/shiprocket/webhook/stream?storeId=xyz
 */
export async function GET(request) {
    const url = new URL(request.url)
    const storeId = url.searchParams.get('storeId')

    if (!storeId) {
        return Response.json({
            error: 'storeId parameter required'
        }, { status: 400 })
    }

    // Create SSE response
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    }

    // Store client
    if (!sseClients.has(storeId)) {
        sseClients.set(storeId, new Set())
    }

    const response = new Response(
        new ReadableStream({
            start(controller) {
                // Send initial connection message
                controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'))

                // Create a custom response object that can write data
                const writer = {
                    write(data) {
                        try {
                            controller.enqueue(new TextEncoder().encode(data))
                        } catch (error) {
                            console.error('SSE write error:', error)
                        }
                    },
                    close() {
                        controller.close()
                    }
                }

                // Add to clients
                sseClients.get(storeId).add(writer)

                // Clean up on disconnect
                const cleanup = () => {
                    sseClients.get(storeId).delete(writer)
                    if (sseClients.get(storeId).size === 0) {
                        sseClients.delete(storeId)
                    }
                    writer.close()
                }

                // Heartbeat to keep connection alive
                const heartbeat = setInterval(() => {
                    try {
                        writer.write(':\n\n')
                    } catch (error) {
                        clearInterval(heartbeat)
                        cleanup()
                    }
                }, 30000)

                // Cleanup on error
                request.signal.addEventListener('abort', () => {
                    clearInterval(heartbeat)
                    cleanup()
                })
            }
        }),
        { headers }
    )

    return response
}
