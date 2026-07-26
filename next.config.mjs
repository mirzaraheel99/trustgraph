const isPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  basePath: isPages ? "/trustgraph" : "",
  assetPrefix: isPages ? "/trustgraph/" : ""
};

export default nextConfig;
