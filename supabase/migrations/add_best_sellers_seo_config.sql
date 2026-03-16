-- Add SEO fields + full config schema to Best Sellers Collection
UPDATE automations
SET config_schema = json_build_object(
  'collection_name', json_build_object(
    'type', 'text',
    'label', 'Collection name',
    'description', 'The display name shown in your Shopify store.',
    'placeholder', 'Best Sellers',
    'default', 'Best Sellers',
    'required', true
  ),
  'collection_handle', json_build_object(
    'type', 'text',
    'label', 'URL handle',
    'description', 'The URL slug for the collection (e.g. best-sellers → /collections/best-sellers).',
    'placeholder', 'best-sellers',
    'default', 'best-sellers',
    'required', true
  ),
  'collection_size', json_build_object(
    'type', 'number',
    'label', 'Number of products',
    'description', 'Maximum number of products to include in the collection.',
    'default', 20,
    'required', true
  ),
  'sales_period', json_build_object(
    'type', 'number',
    'label', 'Sales period (days)',
    'description', 'How many days of order history to use when ranking products.',
    'default', 30,
    'required', true
  ),
  'sort_by', json_build_object(
    'type', 'select',
    'label', 'Rank products by',
    'options', json_build_array('units_sold', 'revenue', 'orders'),
    'default', 'units_sold',
    'required', true
  ),
  'update_frequency', json_build_object(
    'type', 'select',
    'label', 'Update frequency',
    'options', json_build_array('daily', 'weekly'),
    'default', 'weekly',
    'required', true
  ),
  'seo_title', json_build_object(
    'type', 'text',
    'label', 'SEO meta title (optional)',
    'description', 'Overrides the auto-generated SEO title for this collection. Leave blank to use the default.',
    'placeholder', 'Best Sellers | My Store',
    'default', '',
    'required', false
  ),
  'seo_description', json_build_object(
    'type', 'textarea',
    'label', 'SEO meta description (optional)',
    'description', 'Overrides the auto-generated SEO description. Leave blank to use the default.',
    'placeholder', 'Shop our best-selling products. Updated weekly based on real sales data.',
    'default', '',
    'required', false
  )
)::jsonb
WHERE slug = 'best-sellers-collection';
