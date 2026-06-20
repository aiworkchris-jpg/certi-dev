with source as (
    select * from {{ source('certi', 'claims') }}
),

renamed as (
    select
        id              as claim_id,
        shipment_id,
        claimant_email,
        claim_type,
        description,
        status          as claim_status,
        created_at      as claim_filed_at
    from source
)

select * from renamed