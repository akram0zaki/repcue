
```mermaid
graph TD
    A[Postgres<br/>Core Database Engine<br/>(SQL, Transactions, Extensions)]:::db
    B[Supabase API Layer<br/>Auto‑generated REST & GraphQL APIs]:::layer
    C[Auth<br/>Users, JWT, OAuth, Passkeys]:::layer
    D[Storage<br/>File storage (S3‑like)]:::layer
    E[Realtime<br/>Live subscriptions to DB changes]:::layer
    F[Studio & CLI<br/>Web dashboard, tooling, CLI]:::layer

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F

    classDef db fill:#4B9CD3,color:#000,stroke:#000,stroke-width:1px;
    classDef layer fill:#A3D977,color:#000,stroke:#000,stroke-width:1px;
```
