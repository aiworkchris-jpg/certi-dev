with source as (
    select * from {{ source('certi', 'shipments') }}
),

renamed as (
    select
        id                      as shipment_id,
        order_reference,
        merchant_id,
        delivery_company_id,
        item_description,
        item_value,
        item_category,
        customer_name,
        customer_email,
        customer_city,
        customer_postcode,
        status                  as shipment_status,
        tracking_number,
        created_at              as shipment_created_at,
        dispatched_at,
        delivered_at,
        failed_at
    from source
)

select * from renamed