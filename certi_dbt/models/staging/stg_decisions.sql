with source as (
    select * from {{ source('certi', 'decisions') }}
),

renamed as (
    select
        id                  as decision_id,
        claim_id,
        outcome,
        confidence_score,
        decision_report,
        evidence_breakdown,
        overridden_by,
        override_reason,
        overridden_at,
        created_at          as decision_made_at
    from source
)

select * from renamed