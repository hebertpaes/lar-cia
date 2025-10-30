# Real Estate App Architecture - Hebert Paes

## Overview
Modern real estate application inspired by Airbnb design principles, featuring property listings, search functionality, category filtering, and theme switching capabilities.

## Features
1. **Property Listings**: Grid/list view of properties with images, details, and pricing
2. **Search & Filters**: Search bar with location, property type, and room filters
3. **Category Filtering**: Filter properties by categories (Houses, Apartments, Beachfront, Pool, Luxury, etc.)
4. **Theme Toggle**: Light/dark mode switching with system preference support
5. **Responsive Design**: Mobile-first approach with tablet/desktop adaptations
6. **Property Details**: Detailed property view with image gallery and specifications

## Architecture Pattern
- **MVVM (Model-View-ViewModel)** with Repository Pattern
- **Cloud Storage**: Firebase Firestore for real-time data synchronization
- **Authentication**: Firebase Auth with email/password and approval system
- **Local Cache**: SharedPreferences for app settings and offline support
- **Service Layer**: Service classes handle all Firebase operations with real-time listeners
- **UI Components**: Reusable widgets for consistency

## Directory Structure
```
lib/
├── main.dart
├── theme.dart
├── models/
│   ├── property.dart
│   └── property_category.dart
├── services/
│   ├── property_service.dart
│   └── theme_service.dart
├── screens/
│   ├── home_screen.dart
│   └── property_detail_screen.dart
├── widgets/
│   ├── property_card.dart
│   ├── category_filter.dart
│   ├── search_bar_widget.dart
│   └── theme_toggle_button.dart
└── utils/
    └── constants.dart
```

## Data Models
- **Property**: id, title, location, price, images, bedrooms, bathrooms, category, description
- **PropertyCategory**: id, name, icon, filter criteria

## Services
All services use Firebase Firestore with real-time listeners for data synchronization:
- **PropertyService**: CRUD operations, filtering, search functionality, geo-referencing
- **ThemeService**: Theme preference management (local)
- **AuthService**: Firebase Authentication with email/password, admin approval system
- **BlogService**: Blog posts with AI-generated content, featured posts management
- **LeadService**: Lead capture and management from various sources
- **FinancingService**: Financing applications with document upload
- **ScheduleService**: Property visit scheduling (online/in-person)
- **CategoryService**: Dynamic category management
- **PropertyReviewService**: User reviews and ratings for properties
- **AnalyticsService**: User behavior tracking and insights
- **FavoriteService**: User favorites management
- **PaymentsService**: Payment and subscription handling
- **WhatsAppService**: WhatsApp campaign integration via Meta API
- **NewsletterService**: Newsletter subscriptions and campaigns

## Key UI Components
- Modern search bar with location/type/rooms inputs
- Horizontal scrollable category filters
- Property grid with responsive layout
- Property cards with heart icon for favorites
- Clean navigation header with theme toggle
- Mobile-responsive design patterns

## Theme Design
- **Brand Colors**: Blue accent (#1976D2) with neutral grays
- **Typography**: Inter font family with clear hierarchy
- **Layout**: Generous spacing, rounded corners, card-based design
- **Light Mode**: Clean whites with subtle shadows
- **Dark Mode**: Deep backgrounds with elevated surfaces

## Firebase Integration

### Firebase Project
- **Project ID**: hebert-paes-platform
- **Platforms**: Web, Android, iOS
- **Services**: Firestore, Authentication, Storage, Analytics, Functions

### Firestore Collections

#### Core Collections
1. **properties** - Property listings
   - Fields: title, location, price, images, bedrooms, bathrooms, category, description, area, latitude, longitude, isVerified, verificationScore, etc.
   - Security: Public read, admin/manageAds write
   - Indexes: category+createdAt, rentalType+createdAt, isActive+isVerified+createdAt

2. **users** - User profiles
   - Fields: name, email, isAdmin, approved, accessLevel, permissions, preferredCategory, phoneNumber, whatsappOptIn
   - Security: Private (owner/admin read), owner/admin update
   - Indexes: approved+email, accessLevel+email, preferredCategory+email

3. **blog_posts** - Blog articles
   - Fields: slug, title, subtitle, excerpt, body, tags, heroImageUrl, isFeatured, priority, publishedAt
   - Security: Public read, admin write
   - Indexes: isFeatured+priority+publishedAt, tags+publishedAt

4. **leads** - Lead capture
   - Fields: name, email, phone, role, intent, source, status, isPep, wantsFinancing
   - Security: Public create, admin/manageAds read
   - Indexes: status+createdAt, role+createdAt

5. **financing_applications** - Financing requests
   - Fields: userId, name, email, phone, propertyId, status, selectedBank, cpf, documentDataUrls
   - Security: Owner/admin/manageFinancing read, admin/manageFinancing update
   - Indexes: userId+createdAt, status+createdAt

6. **property_reviews** - Property reviews
   - Fields: propertyId, userId, authorName, rating, comment, createdAt
   - Security: Public read, signed-in create, owner/admin update/delete
   - Indexes: propertyId+createdAt

7. **schedule_events** - Visit scheduling
   - Fields: propertyId, agentId, clientEmail, scheduledDate, type (online/in-person), status
   - Security: Agent/client/admin read, agent/admin update
   - Indexes: agentId+start, clientEmail+start, agentId+status+start

#### Supporting Collections
- **categories** - Property categories (admin managed)
- **financial_messages** - Messages between users and financial institutions
- **financial_institution_reports** - Reports from financial partners
- **settings** - App-wide settings (admin only)
- **analytics** - Analytics data (admin only)
- **favorites** - User favorites (private per user)
- **payments** - Payment records (private per user)
- **newsletter_subscriptions** - Newsletter subscribers

### Security Rules
All collections have security rules defined in `firestore.rules`:
- **Helper functions**: isSignedIn(), isAdmin(), isOwner(), isApproved(), hasPermission()
- **Permission system**: manageSites, managePanels, approveUsers, manageAds, manageFinancing
- **Access levels**: 0=user, 1=moderator, 2=admin, 3=admin_full

### Firestore Indexes
All required composite indexes (40+) are defined in `firestore.indexes.json` for efficient queries:
- **Property queries**: category+updatedAt, rentalType+updatedAt, isActive+category+rentalType+updatedAt
- **Search queries**: isActive+title+updatedAt, isActive+location+updatedAt (for prefix search)
- **Admin queries**: status+updatedAt, ownerUserId+updatedAt, isActive+isVerified+createdAt
- **Blog queries**: isFeatured+publishedAt, tags+publishedAt, priority+publishedAt
- **Leads**: status+createdAt, role+createdAt
- **Financing**: userId+createdAt, status+createdAt
- **Scheduling**: agentId+start, clientEmail+start, agentId+status+start
- **Reviews**: propertyId+createdAt
- **Users**: approved+email, accessLevel+email, preferredCategory+email, whatsappOptIn+approved

### Deployment
To deploy Firestore rules and indexes:
1. Open Firebase Panel in left sidebar
2. Check "Deployment Status"
3. Ensure rules and indexes are deployed
4. If not deployed, follow the link in the Firebase Console

### Authentication
- **Provider**: Email/Password (Firebase Auth)
- **Approval Flow**: New users require admin approval before accessing protected features
- **Default Admin**: ciencia@msn.com (admin_full with all permissions)
- **Permissions**: Granular permission system for different admin roles

### Real-time Updates
All services use Firestore real-time listeners (snapshots()) to automatically update the UI when data changes in the database.