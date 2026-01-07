/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        unoptimized: true
    },
    async redirects() {
        return [
            // Redirect www to non-www (clean domain)
            {
                source: '/:path*',
                destination: 'https://pandcjewellery.com/:path*',
                permanent: true,
                has: [
                    {
                        type: 'host',
                        value: 'www\\.pandcjewellery\\.com'
                    }
                ]
            }
        ];
    },
    async headers() {
        return [
            {
                source: '/api/sitemap.xml',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/xml'
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=3600, stale-while-revalidate=86400'
                    }
                ]
            },
            {
                source: '/robots.txt',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'text/plain'
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
