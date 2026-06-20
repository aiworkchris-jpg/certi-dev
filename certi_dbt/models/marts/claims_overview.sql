with claims as (
    select * from {{ ref('stg_claims') }}
),

shipments as (
    select * from {{ ref('stg_shipments') }}
),

decisions as (
    select * from {{ ref('stg_decisions') }}
),

final as (
    select
        -- Claim details
        c.claim_id,
        c.claim_type,
        c.claim_status,
        c.claimant_email,
        c.claim_filed_at,

        -- Shipment details
        s.order_reference,
        s.item_description,
        s.item_value,
        s.item_category,
        s.customer_name,
        s.customer_city,
        s.shipment_status,
        s.delivery_company_id,
        s.shipment_created_at,
        s.dispatched_at,
        s.failed_at,

        -- AI decision details
        d.decision_id,
        d.outcome,
        d.confidence_score,
        d.decision_report,
        d.decision_made_at,
        d.overridden_by,

        -- Derived fields
        case
            when d.outcome = 'APPROVED' then true
            when d.outcome = 'REJECTED' then false
            else null
        end as is_approved,

        round(
            extract(epoch from (d.decision_made_at - c.claim_filed_at)) / 60
        , 1) as decision_time_minutes

    from claims c
    left join shipments s on s.shipment_id = c.shipment_id
    left join decisions d on d.claim_id = c.claim_id
)

select * from final