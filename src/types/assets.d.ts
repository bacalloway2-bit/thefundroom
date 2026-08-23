// TypeScript 6 requires explicit declarations for side-effect asset imports.
// Next.js handles the bundling; these tell the compiler the modules exist.
declare module "*.css";
declare module "*.scss";
declare module "*.svg" {
  const content: string;
  export default content;
}
