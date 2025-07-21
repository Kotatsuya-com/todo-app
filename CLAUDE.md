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
```

### Testing Individual Components
- Run specific pages: Navigate to `http://localhost:3000/{route}` where routes are `/`, `/compare`, `/report`, `/settings`
- Test API endpoints: Use `/api/generate-title`, `/api/slack`, `/api/slack/events`
- Database testing: Use `npm run db:studio` to access Supabase Studio

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
/api/generate-title/     # OpenAI integration for AI-powered task titles
/api/slack/              # Slack message content retrieval (supports threads)
/api/slack/events/       # Slack Event API webhook for emoji reactions
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

#### Two-Mode Integration
1. **Message Retrieval**: Parse Slack URLs to fetch message content via Web API
   - Supports channel messages, DMs, and threaded conversations
   - Handles timestamp conversion and API method selection
   
2. **Event-Driven Automation**: Real-time task creation from emoji reactions
   - Listens to `reaction_added` events via webhooks
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

#### Security Model
- All tables protected by RLS policies
- User isolation via `auth.uid() = user_id` checks
- Complex policy for `completion_log` using JOIN to verify ownership

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
- `SLACK_BOT_TOKEN`: Required for message retrieval and webhook events
- `SLACK_SIGNING_SECRET`: Webhook signature verification
- `NGROK_AUTHTOKEN`: Enhanced ngrok features for webhook development

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
- **Testing Webhooks**: Use `npm run dev:webhook` with ngrok
- **Event Testing**: Create test Slack workspace for safe emoji reaction testing
- **Debugging**: Check server logs for detailed reaction processing information
- **User Setup**: Ensure Slack User ID is configured in app settings for reaction automation

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