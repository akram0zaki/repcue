# RepCue Supabase Setup

This directory contains the Supabase configuration, database migrations, and Edge Functions for the RepCue application.

## Setup Instructions

### 1. Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

### 2. Initialize Local Development

```bash
# Start local Supabase instance
supabase start

# This will:
# - Start Postgres database on port 54322
# - Start API server on port 54321
# - Start Studio on port 54323
# - Apply migrations and seed data
```

### 3. Environment Variables

Copy the environment variables from the local setup:

```bash
# Copy from supabase start output
cp .env.example .env

# Update the values with your local/production URLs and keys
```

For local development, the URLs will typically be:
- `SUPABASE_URL=http://127.0.0.1:54321`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### 4. Deploy Edge Functions (Production)

```bash
# Login to Supabase (if using cloud)
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy sync
```

### 5. Apply Migrations (Production)

```bash
# Push database changes
supabase db push

# Or apply migrations individually
supabase migration up
```

## Project Structure

```
supabase/
├── config.toml           # Supabase configuration
├── migrations/           # Database migrations
├── functions/           # Edge Functions
│   ├── sync/           # Main sync function
│   └── _shared/        # Shared utilities
├── seed.sql            # Initial data
└── README.md           # This file
```

## Database Schema

The database includes the following tables:
- `user_preferences` - User-specific settings and preferences
- `app_settings` - Application-wide settings per user
- `exercises` - Exercise definitions (shared and user-created)
- `workouts` - Custom workout configurations
- `activity_logs` - Exercise session history
- `workout_sessions` - Workout session tracking
- `profiles` - User profile information
- `sync_cursors` - Sync state tracking

All tables include metadata for sync functionality:
- `owner_id` - User ownership
- `updated_at` - Last modification timestamp
- `deleted` - Soft delete flag
- `version` - Conflict resolution version

## Row Level Security

All tables have Row Level Security (RLS) enabled with policies that:
- Allow users to access only their own data (`owner_id = auth.uid()`)
- Allow anonymous data to be claimed during first sync (`owner_id IS NULL`)
- Prevent unauthorized access to other users' data

## Edge Functions

### sync Function

The main sync function (`/functions/sync`) handles:
- Client data upload (upserts and deletes)
- Server data download (changes since last sync)
- Conflict resolution using last-writer-wins
- Sync cursor management

Request format:
```json
{
  "since": "2025-01-20T10:32:11.000Z",
  "tables": {
    "workouts": { "upserts": [...], "deletes": [...] },
    "exercises": { "upserts": [...], "deletes": [...] }
  },
  "clientInfo": { "appVersion": "1.0.0", "deviceId": "uuid" }
}
```

Response format:
```json
{
  "changes": {
    "workouts": { "upserts": [...], "deletes": [...] },
    "exercises": { "upserts": [...], "deletes": [...] }
  },
  "cursor": "2025-01-20T11:02:55.000Z"
}
```

## Development

### Local Testing

```bash
# Start local instance
supabase start

# Test sync function locally
curl -X POST http://localhost:54321/functions/v1/sync \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"tables":{}}'
```

### Logs

```bash
# View function logs
supabase functions logs sync

# View database logs
supabase logs db
```

## Production Deployment

1. Set up your Supabase project at https://supabase.com
2. Update environment variables with production URLs and keys
3. Deploy functions: `supabase functions deploy`
4. Apply migrations: `supabase db push`
5. Enable authentication providers in Supabase dashboard
6. Update frontend environment variables

## Troubleshooting

### Common Issues

1. **Function not found**: Make sure to deploy functions after local development
2. **JWT validation failed**: Check that the JWT token is valid and not expired
3. **RLS policy violation**: Ensure user is authenticated and owns the data
4. **Migration conflicts**: Reset local database with `supabase db reset`

### Debug Commands

```bash
# Reset local database
supabase db reset

# View current migrations
supabase migration list

# Generate types
supabase gen types typescript --local > types.ts
```