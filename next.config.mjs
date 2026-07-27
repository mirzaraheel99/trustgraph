const isPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  turbopack: {
    root: process.cwd()
  },
  images: {
    unoptimized: true
  },
  basePath: isPages ? "/trustgraph" : "",
  assetPrefix: isPages ? "/trustgraph/" : ""
};

export default nextConfig;
