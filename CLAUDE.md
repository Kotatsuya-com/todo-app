# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Structure

This project uses a comprehensive documentation system organized in the `docs/` directory:

```
docs/
├── setup/               # 🚀 Setup and Environment
│   ├── SETUP.md         # Main setup guide (3 environments)
│   ├── ENVIRONMENT.md   # Environment variables guide
│   └── TROUBLESHOOTING.md # Common issues and solutions
├── architecture/        # 🏗️ Architecture and Design
│   ├── ARCHITECTURE.md  # Clean Architecture overview
│   ├── DATABASE.md      # Database design (Supabase PostgreSQL)
│   └── API.md           # Complete API specifications
├── development/         # 👨‍💻 Development Guidelines
│   ├── DEVELOPMENT.md   # Development rules and workflow
│   ├── TESTING.md       # Testing strategy and patterns
│   └── SECURITY.md      # Security practices
├── features/            # ✨ Feature Documentation
│   ├── SLACK.md         # Slack integration details
│   └── UI_SPEC.md       # UI/UX specifications
└── project/             # 📋 Project Management
    ├── STRUCTURE.md     # Project structure and organization
    └── CHANGELOG.md     # Feature history and updates
```

**IMPORTANT**: Always refer to the appropriate documentation before making changes:
- For setup issues → `docs/setup/`
- For architecture questions → `docs/architecture/`
- For development guidelines → `docs/development/`
- For feature specifications → `docs/features/`

The main README.md provides navigation links to all documentation.

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

### Testing Strategy (Clean Architecture)

#### Test Priority and Structure
1. **Entity Tests** (Highest Priority): Domain logic and business rules
2. **Service Tests** (High Priority): Business use cases with mocked repositories
3. **Repository Tests** (Medium Priority): Data access logic
4. **API Tests** (Integration): HTTP handling with mocked services

#### Testing Patterns

**Entity Testing:**
```typescript
// __tests__/lib/entities/TodoEntity.test.ts
describe('TodoEntity', () => {
  it('should determine urgency correctly', () => {
    const todo = new TodoEntity(mockTodoWithDeadlineToday)
    expect(todo.isUrgent()).toBe(true)
    expect(todo.getQuadrant()).toBe('urgent_important')
  })
})
```

**Service Testing:**
```typescript
// __tests__/lib/services/SlackService.test.ts
describe('SlackService', () => {
  let slackService: SlackService
  let mockSlackRepo: MockSlackRepository
  
  beforeEach(() => {
    mockSlackRepo = new MockSlackRepository([
      webhookNotFoundResponse(),
      eventQueuedResponse()
    ])
    slackService = new SlackService(mockSlackRepo, mockTodoRepo)
  })
  
  it('should process webhook events correctly', async () => {
    const result = await slackService.processWebhookEvent(webhookId, payload)
    expect(result.success).toBe(true)
  })
})
```

**API Testing (Clean Architecture):**
```typescript
// Mock services, not Supabase clients
jest.mock('@/lib/services/SlackService', () => ({
  SlackService: jest.fn().mockImplementation(() => mockSlackService)
}))

it('should handle webhook events', async () => {
  mockSlackService.setMockResults([eventQueuedResponse()])
  const response = await POST(request, { params: { webhook_id } })
  expect(response.status).toBe(200)
})
```

#### Legacy Testing (To Be Migrated)
- **Pages**: Navigate to `http://localhost:3000/{route}` where routes are `/`, `/compare`, `/report`, `/settings`
- **Legacy API endpoints**: Use `/api/generate-title`, `/api/slack`, `/api/slack/connections`
- **Database testing**: Use `npm run db:studio` to access Supabase Studio
- **Coverage**: Focus on testing lib utilities - see `jest.config.js` for coverage configuration

#### Test File Organization
```
__tests__/
├── lib/
│   ├── entities/        # 🏛️ Domain layer tests
│   ├── services/        # ⚙️ Service layer tests  
│   └── repositories/    # 📊 Repository layer tests
├── api/                 # 🌐 API integration tests
└── mocks/
    ├── services.ts      # Service layer mocks
    └── repositories.ts  # Repository layer mocks
```

## Architecture Overview

**🚨 IMPORTANT: This project uses Clean Architecture pattern. All new implementations MUST follow Clean Architecture principles.**

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Architecture**: Clean Architecture (Domain, Repository, Service, API layers)
- **State Management**: Zustand (being migrated to Service layer)
- **External APIs**: OpenAI (title generation), Slack (message retrieval + webhooks)
- **Development**: Docker (local Supabase), ngrok (webhook testing)

### Clean Architecture Implementation

#### Layer Structure
```
lib/entities/          # 🏛️ Domain Layer - Business objects & rules
lib/repositories/      # 📊 Infrastructure Layer - Data access
lib/services/          # ⚙️ Application Layer - Business logic & use cases
app/api/              # 🌐 Presentation Layer - HTTP handlers
```

#### Development Rules (MANDATORY)

**✅ NEW IMPLEMENTATIONS**:
1. **ALWAYS use Clean Architecture structure**
2. **Business logic goes in Service layer**
3. **Data access goes in Repository layer**
4. **APIs only handle HTTP concerns**
5. **Write unit tests for Service and Entity layers**

**🔄 LEGACY CODE MIGRATION**:
- Existing APIs using direct Supabase calls will be gradually migrated
- New features MUST use Clean Architecture version
- When modifying existing APIs, consider migrating to Clean Architecture

**❌ FORBIDDEN**:
- Direct Supabase client usage in new APIs
- Business logic in API routes
- Complex mock chains in tests (use Service layer mocks instead)

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

#### Clean Architecture Example Implementation

**Slack Events API (Clean Architecture version):**
```typescript
// 🌐 API Layer - HTTP concerns only
export async function POST(request: NextRequest, { params }: RouteParams) {
  const payload = JSON.parse(await request.text())
  const isValid = await verifySlackSignature(request, body)
  
  // Delegate to Service layer
  const { slackService } = createServices()
  const result = await slackService.processWebhookEvent(webhook_id, payload)
  
  return NextResponse.json(result.data, { status: result.statusCode })
}

// ⚙️ Service Layer - Business logic
class SlackService {
  async processWebhookEvent(webhookId, payload) {
    const webhook = await this.slackRepo.findWebhookById(webhookId)
    const user = await this.slackRepo.findUserWithSettings(webhook.user_id)
    // Business logic here...
    return { success: true, data: result }
  }
}

// 📊 Repository Layer - Data access
class SlackRepository {
  async findWebhookById(webhookId) {
    const result = await this.client.from('user_slack_webhooks')
      .select('*').eq('webhook_id', webhookId).single()
    return RepositoryUtils.handleSupabaseResult(result)
  }
}
```

#### API Architecture
```
# Clean Architecture APIs (NEW)
/api/slack/events/user/[webhook_id]/   # ✅ Clean Architecture implementation

# Legacy APIs (TO BE MIGRATED)
/api/generate-title/                    # OpenAI integration for AI-powered task titles
/api/slack/                            # Slack message content retrieval (supports threads)
/api/slack/auth/                       # Slack OAuth authentication flow
/api/slack/connections/                # Slack connection management (CRUD)
/api/slack/webhook/                    # User-specific webhook management
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

#### Adding New Features (Clean Architecture)

**🚨 MANDATORY: All new features must use Clean Architecture**

1. **Define Domain Entity** (`lib/entities/`):
   ```typescript
   export class NewEntity {
     constructor(private data: NewData) {}
     
     // Business rules and validation here
     validateBusinessRule(): boolean { /* ... */ }
   }
   ```

2. **Create Repository Interface** (`lib/repositories/`):
   ```typescript
   export interface NewRepositoryInterface {
     findById(id: string): Promise<RepositoryResult<NewEntity>>
     create(data: NewData): Promise<RepositoryResult<NewEntity>>
   }
   ```

3. **Implement Service** (`lib/services/`):
   ```typescript
   export class NewService {
     constructor(private newRepo: NewRepositoryInterface) {}
     
     async businessOperation(params): Promise<ServiceResult<NewEntity>> {
       // Business logic using repository
     }
   }
   ```

4. **Create API Handler** (`app/api/`):
   ```typescript
   export async function POST(request: NextRequest) {
     const { newService } = createServices()
     const result = await newService.businessOperation(params)
     return NextResponse.json(result.data, { status: result.statusCode })
   }
   ```

5. **Write Tests**:
   - Entity unit tests
   - Service unit tests with mocked repositories
   - API integration tests with mocked services

**❌ FORBIDDEN for new features**:
- Direct Supabase usage in API routes
- Business logic in API handlers
- Zustand store extensions (use Service layer instead)

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

## 📝 Recent Updates (August 2025)

### 🏗️ Clean Architecture Implementation (NEW)

**Major architectural overhaul to Clean Architecture pattern for improved maintainability and testability.**

#### New Architecture Components
- **Domain Layer** (`lib/entities/`): Business objects with validation and domain rules
  - `UserEntity`, `SlackConnectionEntity`, `SlackWebhookEntity`, `TodoEntity`
  - Pure business logic without external dependencies
  
- **Repository Layer** (`lib/repositories/`): Data access abstraction
  - `SlackRepository`, `TodoRepository`, `BaseRepository`
  - Unified error handling and Supabase client management
  
- **Service Layer** (`lib/services/`): Business use cases and logic
  - `SlackService` with complete Slack webhook processing logic
  - External API coordination (Slack, OpenAI)
  
- **API Layer Refactoring**: Thin HTTP handlers delegating to services
  - **Migrated**: `/api/slack/events/user/[webhook_id]/` (Clean Architecture)
  - **To Migrate**: All other APIs currently using direct Supabase calls

#### Testing Infrastructure Overhaul
- **Service Layer Mocks**: `MockSlackService` for simplified testing
- **Repository Mocks**: Result-based testing approach eliminating complex Supabase mock chains
- **100% Test Success Rate**: All 281 tests passing with new architecture
- **Test Simplification**: Reduced test complexity from 30+ mock lines to single-line service mocks

#### Development Rules & Guidelines
- **MANDATORY**: All new features must use Clean Architecture
- **FORBIDDEN**: Direct Supabase usage in new API routes
- **MIGRATION PLAN**: Gradual migration of legacy APIs to Clean Architecture
- **TESTING PRIORITY**: Service > Repository > Entity > API integration tests

### Legacy Features (January 2025)

#### User-Specific Slack Webhook System
- **Database Schema**: Added `user_slack_webhooks` table with secure webhook management
- **API Endpoints**: New `/api/slack/webhook/` for webhook CRUD operations
- **Security Enhancement**: Unique webhook IDs and secrets for each user connection

#### Enhanced Slack Integration
- **OAuth Flow**: Complete user-specific Slack workspace authentication
- **Connection Management**: Full CRUD for Slack workspace connections
- **Dynamic URLs**: Automatic app URL detection for ngrok/production environments

#### Database & Performance Improvements
- **Task Source Tracking**: `created_via` column distinguishes manual vs Slack webhook task creation
- **RLS Policies**: Row Level Security for all new Slack-related tables
- **Performance Indexes**: Optimized database indexes for webhook operations and task queries