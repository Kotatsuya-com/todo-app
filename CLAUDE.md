# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development Environment
```bash
# Start local development (recommended)
npm run dev              # Full local environment with Supabase
npm run dev:webhook      # Development with ngrok for Slack webhooks
npm run dev:quick        # Development using production database

# Database operations
npm run db:start         # Start local Supabase
npm run db:stop          # Stop local Supabase
npm run db:status        # Check Supabase status
npm run db:studio        # Open Supabase Studio
npm run db:reset         # Reset local database with migrations

# Migration management
npm run migrate:new      # Create new migration
npm run db:migrate       # Push migrations to database
npm run types:generate   # Generate TypeScript types from database schema

# Build and deployment
npm run build            # Production build
npm run lint             # ESLint check

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Run Jest in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Testing Individual Components
- **Pages**: Navigate to `http://localhost:3000/{route}` where routes are `/`, `/compare`, `/report`, `/settings`
- **API endpoints**: Use `/api/generate-title`, `/api/slack`, `/api/slack/events`
- **Database testing**: Use `npm run db:studio` to access Supabase Studio
- **Unit tests**: Jest configuration with jsdom environment for React component testing
- **Test patterns**: Tests should be placed in `__tests__/` directories or use `.test.ts` or `.spec.ts` suffixes
- **Coverage**: Focus on testing lib utilities - see `jest.config.js` for coverage configuration

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand with integrated business logic
- **External APIs**: OpenAI (title generation), Slack (message retrieval + webhooks)
- **Development**: Docker (local Supabase), ngrok (webhook testing)

### Core Architecture Patterns

#### Database-First Design
- **Schema**: `users` → `todos` → (`comparisons` + `completion_log`)
- **Security**: Complete Row Level Security (RLS) on all tables
- **Auth Integration**: Automatic user creation via database triggers
- **Migration Strategy**: Single comprehensive initial migration with incremental updates

#### State Management (Zustand)
- **Single Store**: `store/todoStore.ts` handles all TODO operations, user state, and business logic
- **Elo Rating System**: Built-in algorithm for task importance scoring via pairwise comparisons
- **Deadline Management**: Automatic conversion from urgency levels to specific dates
- **Async Operations**: All database operations with loading states and error handling

#### API Architecture
```
/api/generate-title/                    # OpenAI integration for AI-powered task titles
/api/slack/                            # Slack message content retrieval (supports threads)
/api/slack/auth/                       # Slack OAuth authentication flow
/api/slack/connections/                # Slack connection management (CRUD)
/api/slack/webhook/                    # User-specific webhook management
/api/slack/events/user/[webhook_id]/   # User-specific Slack Event API webhooks
/api/app-url/                          # Dynamic app URL detection for ngrok/production
```

#### Authentication Flow
- **Middleware**: `middleware.ts` protects `/compare` and `/report` routes
- **SSR Integration**: `@supabase/ssr` for server-side auth with cookies
- **Client State**: `AuthProvider` manages client-side authentication state

### Component Organization

#### Route Structure
- **Dashboard** (`/`): Eisenhower matrix + list view toggle, task CRUD operations
- **Compare** (`/compare`): Pairwise task comparison with Elo rating updates
- **Report** (`/report`): Analytics dashboard with Recharts visualization
- **Settings** (`/settings`): User profile and Slack integration configuration

#### Component Patterns
- **Modal-Based Forms**: `CreateTodoModal` + `EditTodoModal` using shared `TodoForm`
- **Compound Components**: `TodoCard` with embedded actions and state management
- **Mobile-First**: Responsive design with hamburger navigation via `MobileMenu`

### Slack Integration Architecture

#### Three-Mode Integration
1. **Message Retrieval**: Parse Slack URLs to fetch message content via Web API
   - Supports channel messages, DMs, and threaded conversations
   - Handles timestamp conversion and API method selection
   
2. **OAuth Authentication**: User-specific Slack workspace connections
   - Each user connects their own Slack workspace via OAuth
   - Secure token storage in `slack_connections` table
   - Workspace-specific permissions and access control
   
3. **Event-Driven Automation**: Real-time task creation from emoji reactions
   - User-specific webhook endpoints for each connected workspace
   - Listens to `reaction_added` events via secure webhooks
   - Maps 5 specific emoji types to urgency levels
   - Async processing to comply with Slack's 3-second response requirement

#### URL Pattern Support
```
Channel: https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP
Thread:  https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS
```

### Development Environment Modes

#### 1. Local Development (Recommended)
- Local Supabase instance via Docker
- Isolated database with migrations
- No external dependencies
- Use `npm run dev`

#### 2. Webhook Development
- Local Supabase + ngrok tunnel for Slack webhooks
- Requires ngrok installation and optional auth token
- Use `npm run dev:webhook`

#### 3. Production Database Development
- Connect to Supabase cloud for testing with real data
- Requires production environment variables
- Use `npm run dev:quick`

### Key Business Logic

#### Elo Rating System
- **Implementation**: `calculateEloRatings()` in todoStore
- **K-factor**: 32 for rating adjustments
- **Normalization**: Scores converted to 0-1 range for importance_score
- **Real-time Updates**: Ratings recalculated after each comparison

#### Deadline Management
- **Urgency Mapping**: `now/today` → today, `tomorrow` → tomorrow, `later` → null
- **Emergency Detection**: `deadline <= CURRENT_DATE` for urgency classification
- **Quadrant Classification**: Urgent/Important matrix based on deadline + importance_score

#### Task Lifecycle
1. **Creation**: Via manual input or Slack integration (URL/reaction)
2. **Prioritization**: Through pairwise comparison system
3. **Completion**: Updates completion_log for analytics
4. **Deletion**: Cascade deletion of related comparisons and completion records

### Database Schema Key Points

#### User Management
```sql
-- Automatic user creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Core Tables
```sql
-- User-specific Slack webhook management
CREATE TABLE user_slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slack_connection_id UUID REFERENCES slack_connections(id) ON DELETE CASCADE,
  webhook_id TEXT UNIQUE NOT NULL,
  webhook_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_event_at TIMESTAMP WITH TIME ZONE,
  event_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Slack workspace connections per user
CREATE TABLE slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Security Model
- All tables protected by RLS policies
- User isolation via `auth.uid() = user_id` checks
- Complex policy for `completion_log` using JOIN to verify ownership
- User-specific webhook URLs with secure secret verification

#### Foreign Key Strategy
- Manual cascade deletion in application code
- Ensures data consistency while maintaining performance
- Implemented in `deleteTodo()` function

### Environment Configuration

#### Required Environment Variables
- `OPENAI_API_KEY`: Essential for title generation
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side database operations

#### Optional Slack Integration
- `SLACK_CLIENT_ID` + `NEXT_PUBLIC_SLACK_CLIENT_ID`: OAuth Client ID for user authentication
- `SLACK_CLIENT_SECRET`: OAuth Client Secret for secure token exchange
- `NGROK_AUTHTOKEN`: Enhanced ngrok features for HTTPS development

### Development Workflow

#### Making Database Changes
1. Create migration: `npm run migrate:new description`
2. Edit SQL file in `supabase/migrations/`
3. Test locally: `npm run db:reset`
4. Deploy: `npm run db:migrate`
5. Update types: `npm run types:generate`

#### Adding New Features
- **UI Components**: Place in appropriate `components/` subdirectory
- **API Endpoints**: Add to `app/api/` with consistent error handling
- **State Management**: Extend `todoStore.ts` with new actions
- **Database Changes**: Always use migrations for schema updates

#### Slack Development
- **Testing Message Retrieval**: Use real Slack URLs in development
- **OAuth Testing**: Connect test Slack workspace via settings page
- **Testing Webhooks**: Use `npm run dev:webhook` with ngrok for user-specific webhooks
- **Webhook Management**: Create/manage user webhooks via `/api/slack/webhook`
- **Event Testing**: Create test Slack workspace for safe emoji reaction testing
- **Debugging**: Check server logs for detailed reaction processing information
- **URL Patterns**: User-specific webhook URLs: `/api/slack/events/user/[webhook_id]`
- **Security**: Each webhook has unique ID and secret for signature verification

### Production Deployment

#### Vercel Configuration
- Automatic builds from main branch
- Environment variables configured in Vercel dashboard
- Serverless function deployment for API routes

#### Database Deployment
- Supabase cloud instance
- Migration deployment via `npm run db:migrate`
- Production environment variables

This architecture enables rapid development while maintaining production-grade security, performance, and scalability.

## 📝 Recent Updates (January 2025)

### User-Specific Slack Webhook System
- **New Architecture**: Each user gets individual webhook endpoints for Slack integration
- **Database Schema**: Added `user_slack_webhooks` table with secure webhook management
- **API Endpoints**: New `/api/slack/webhook/` for webhook CRUD operations
- **Security Enhancement**: Unique webhook IDs and secrets for each user connection
- **URL Pattern**: User-specific webhook URLs: `/api/slack/events/user/[webhook_id]`

### Enhanced Slack Integration
- **OAuth Flow**: Complete user-specific Slack workspace authentication
- **Webhook Manager**: New `WebhookManager` component for UI-based webhook management
- **Connection Management**: Full CRUD for Slack workspace connections
- **Dynamic URLs**: Automatic app URL detection for ngrok/production environments

### Database Improvements
- **New Migration**: `20250727085000_fix_webhook_encoding.sql` for secure webhook ID generation
- **Base64URL Encoding**: Improved webhook ID generation with URL-safe characters
- **RLS Policies**: Row Level Security for all new Slack-related tables
- **Performance Indexes**: Optimized database indexes for webhook operations

### Development Workflow Enhancements
- **Improved ngrok Integration**: Better handling of ngrok tunnels for webhook development
- **Error Handling**: Enhanced error messages and logging for Slack operations
- **Testing Support**: Easier testing of user-specific webhook functionality