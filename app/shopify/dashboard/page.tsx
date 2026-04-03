/**
 * Embedded dashboard — reuses the exact same component as the standalone
 * dashboard. The embedded layout (app/shopify/layout.tsx) strips the
 * Navigation and Footer, so this renders cleanly inside the Shopify admin.
 */
export { default } from '@/app/dashboard/page';
