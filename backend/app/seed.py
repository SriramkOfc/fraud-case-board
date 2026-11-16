from app.models import BoardData

SEED_BOARD = BoardData.model_validate(
    {
        "columns": [
            {
                "id": "col-alert",
                "title": "Alert Triggered",
                "cardIds": [
                    "card-1",
                    "card-2"
                ]
            },
            {
                "id": "col-review",
                "title": "Review",
                "cardIds": [
                    "card-3",
                    "card-4"
                ]
            },
            {
                "id": "col-investigation",
                "title": "Investigation",
                "cardIds": [
                    "card-5"
                ]
            },
            {
                "id": "col-verification",
                "title": "Verification",
                "cardIds": [
                    "card-6"
                ]
            },
            {
                "id": "col-decision",
                "title": "Decision",
                "cardIds": [
                    "card-7",
                    "card-8"
                ]
            }
        ],
        "cards": {
            "card-1": {
                "id": "card-1",
                "title": "Velocity rule: 14 card txns in 10 min",
                "details": "Rule engine flagged rapid low-value card-not-present purchases. Auto-hold placed; assign to analyst queue by risk score.",
                "customerName": "Daniel Okafor",
                "accountLast4": "4821",
                "amount": 1260.0,
                "createdAt": "2026-11-16T08:42:00Z",
                "updatedAt": "2026-11-16T08:42:00Z"
            },
            "card-2": {
                "id": "card-2",
                "title": "ML score 0.94: new device login + wire",
                "details": "Model alert on login from unseen device followed by $18,500 outbound wire. Wire paused pending triage.",
                "customerName": "Priya Sharma",
                "accountLast4": "7310",
                "amount": 18500.0,
                "createdAt": "2026-11-16T09:05:00Z",
                "updatedAt": "2026-11-16T09:05:00Z"
            },
            "card-3": {
                "id": "card-3",
                "title": "Triage: geo-mismatch purchase",
                "details": "Check customer profile, travel notes, and recent history. Rule out false positive before escalating.",
                "customerName": "Lucas Moreau",
                "accountLast4": "2954",
                "amount": 2340.75,
                "createdAt": "2026-11-15T22:18:00Z",
                "updatedAt": "2026-11-16T07:30:00Z"
            },
            "card-4": {
                "id": "card-4",
                "title": "Triage: duplicate refund requests",
                "details": "Confirm alert data is complete, dedupe related alerts, and link to existing case if one is open.",
                "customerName": "Hannah Becker",
                "accountLast4": "6627",
                "amount": 489.9,
                "createdAt": "2026-11-15T19:47:00Z",
                "updatedAt": "2026-11-16T06:55:00Z"
            },
            "card-5": {
                "id": "card-5",
                "title": "Account takeover - merchant #4471",
                "details": "Pull device fingerprints, IP logs, and linked accounts. Trace fund flow and document timeline in case notes.",
                "customerName": "Kestrel Home Supplies Pty Ltd",
                "accountLast4": "1093",
                "amount": 42300.0,
                "createdAt": "2026-11-14T14:30:00Z",
                "updatedAt": "2026-11-15T23:10:00Z"
            },
            "card-6": {
                "id": "card-6",
                "title": "Confirm txns with cardholder",
                "details": "Outbound call / OTP verification with customer. Validate identity (KYC) and confirm which transactions are disputed.",
                "customerName": "Mei Lin Tan",
                "accountLast4": "5582",
                "amount": 3115.2,
                "createdAt": "2026-11-14T11:02:00Z",
                "updatedAt": "2026-11-15T21:40:00Z"
            },
            "card-7": {
                "id": "card-7",
                "title": "Confirmed fraud - close and recover",
                "details": "Block card, reissue, file chargeback, and submit SAR if thresholds are met. Feed outcome back to model labels.",
                "customerName": "Omar Haddad",
                "accountLast4": "8046",
                "amount": 7899.0,
                "createdAt": "2026-11-12T16:25:00Z",
                "updatedAt": "2026-11-15T18:05:00Z"
            },
            "card-8": {
                "id": "card-8",
                "title": "False positive - release hold",
                "details": "Release funds, notify customer, and record reason code to tune the triggering rule.",
                "customerName": "Sofia Alvarez",
                "accountLast4": "3378",
                "amount": 952.4,
                "createdAt": "2026-11-13T10:10:00Z",
                "updatedAt": "2026-11-15T15:20:00Z"
            }
        }
    }
)
