# Firestore Database Schema

This document describes the Firestore collections and document structure for the Hebert Paes real estate platform.

## Collections Overview

| Collection | Access | Description |
|------------|--------|-------------|
| `users` | Private | User profiles with permissions and settings |
| `properties` | Public Read | Real estate listings |
| `blog_posts` | Public Read | Blog articles and news |
| `property_reviews` | Public Read | Property ratings and comments |
| `leads` | Admin/Manager | Contact form submissions and inquiries |
| `financing_applications` | Private | Mortgage and financing requests |
| `schedule_events` | Private | Property visit appointments |
| `financial_messages` | Private | Communication about financing |
| `financial_institution_reports` | Admin Only | Bank and lender reports |

---

## 1. Users Collection

**Path**: `/users/{userId}`

**Access**: Private (user owns their document, admins can access all)

### Document Structure

```typescript
{
  id: string,                    // User ID (matches auth UID)
  name: string,                   // Full name
  email: string,                  // Email address
  avatarUrl: string?,             // Profile photo URL
  isAdmin: boolean,               // Admin flag
  approved: boolean,              // Account approved by admin
  accessLevel: number,            // 0=user, 1=moderator, 2=admin, 3=admin_full
  permissions: {                  // Granular permissions
    manageSites: boolean,
    managePanels: boolean,
    approveUsers: boolean,
    manageAds: boolean,
    manageFinancing: boolean
  },
  preferredCategory: string?,     // Favorite property category
  phoneNumber: string?,           // Phone for WhatsApp campaigns
  whatsappOptIn: boolean,         // Consent for WhatsApp messages
  creditAnalysisConsent: boolean, // Consent for credit check
  dataSharingConsent: boolean     // Consent to share with banks
}
```

### Sample Document

```json
{
  "id": "admin_user_001",
  "name": "Admin Ciencia",
  "email": "ciencia@msn.com",
  "avatarUrl": "https://i.pravatar.cc/150?u=ciencia@msn.com",
  "isAdmin": true,
  "approved": true,
  "accessLevel": 3,
  "permissions": {
    "manageSites": true,
    "managePanels": true,
    "approveUsers": true,
    "manageAds": true,
    "manageFinancing": true
  },
  "preferredCategory": "luxo",
  "phoneNumber": "+5565999887766",
  "whatsappOptIn": true,
  "creditAnalysisConsent": true,
  "dataSharingConsent": true
}
```

---

## 2. Properties Collection

**Path**: `/properties/{propertyId}`

**Access**: Public read, admin/manager write

### Document Structure

```typescript
{
  id: string,
  title: string,
  location: string,
  price: number,
  images: string[],              // Image URLs
  bedrooms: number,
  bathrooms: number,
  garages: number?,
  suites: number?,
  category: string,              // casa, apartamento, fazenda, etc.
  description: string,
  area: number,                  // in m²
  isFavorite: boolean,
  rentalType: string,            // sale, monthly, daily, seasonal
  isActive: boolean,
  createdAt: number,             // timestamp
  updatedAt: number,             // timestamp
  latitude: number?,
  longitude: number?,
  yearBuilt: number?,
  condoFee: number?,
  proximities: string[],         // nearby points of interest
  isVerified: boolean,
  verificationScore: number,     // 0.0 to 1.0
  proofUrls: string[],
  verificationNotes: string,
  verifiedBy: string,            // 'ai' | 'manual' | ''
  verifiedAt: number?            // timestamp
}
```

### Categories

- `casa` - Houses
- `apartamento` - Apartments
- `praia` - Beachfront
- `piscina` - With pool
- `luxo` - Luxury
- `condominio` - Gated community
- `rural` - Rural areas
- `florais_da_mata` - Florais da Mata (VG-MT)
- `sitios_chacaras` - Ranches
- `cuiaba` - Cuiabá region
- `fazenda` - Farms
- `exotico` - Exotic locations

---

## 3. Blog Posts Collection

**Path**: `/blog_posts/{postId}`

**Access**: Public read, admin write

### Document Structure

```typescript
{
  id: string,
  slug: string,                  // URL-friendly identifier
  title: string,                 // Max 76 characters
  subtitle: string,              // 50-55 characters
  excerpt: string,               // SEO description 139-149 chars
  body: string,                  // Full article text
  tags: string[],
  heroImageUrl: string,
  imageCredit: string,
  authorName: string,
  publishedAt: number,           // timestamp
  updatedAt: number,             // timestamp
  feedbacks: [
    {
      id: string,
      authorName: string,
      authorAvatarUrl: string,
      body: string,
      rating: number,            // 1-5
      createdAt: string          // ISO date
    }
  ],
  isFeatured: boolean,
  sourceUrls: string[],          // Reference links
  priority: number,              // Sorting priority
  scheduledFrom: number?,        // timestamp
  scheduledTo: number?           // timestamp
}
```

---

## 4. Property Reviews Collection

**Path**: `/property_reviews/{reviewId}`

**Access**: Public read, authenticated write

### Document Structure

```typescript
{
  id: string,
  propertyId: string,            // Reference to property
  authorName: string,
  rating: number,                // 1-5 stars
  comment: string,
  createdAt: number              // timestamp
}
```

---

## 5. Leads Collection

**Path**: `/leads/{leadId}`

**Access**: Admin and users with `manageAds` permission

### Document Structure

```typescript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  role: string,                  // cliente, anunciante, investidor, etc.
  intent: string,                // comprar, alugar, anunciar, investir
  source: string,                // home, blog, property
  isPep: boolean,                // Politically exposed person
  hasElectronicLocks: boolean,
  wantsFinancing: boolean,
  status: string,                // novo, contatado, qualificado, ganho, perdido
  createdAt: number,
  updatedAt: number,
  notes: string?
}
```

### Lead Roles

- `cliente` - Buyer/renter
- `anunciante` - Advertiser
- `investidor` - Investor
- `franqueado` - Franchisee
- `afiliado` - Affiliate
- `incorporador` - Developer

---

## 6. Financing Applications Collection

**Path**: `/financing_applications/{applicationId}`

**Access**: Owner and admin/finance managers

### Document Structure

```typescript
{
  id: string,
  userId: string,
  name: string,
  email: string,
  phone: string,
  monthlyIncome: number?,
  propertyId: string?,
  source: string,
  blogSlug: string?,
  isPep: boolean,
  createdAt: number,
  status: string,                // prospect, client, rejected
  selectedBank: string?,
  wantsInsurance: boolean,
  cpf: string?,
  profilePhotoDataUrl: string?,
  documentDataUrls: string[]?,
  videoUrl: string?
}
```

---

## 7. Schedule Events Collection

**Path**: `/schedule_events/{eventId}`

**Access**: Agent, client, and admin

### Document Structure

```typescript
{
  id: string,
  title: string,
  start: number,                 // timestamp
  end: number,                   // timestamp
  agentEmail: string,
  clientName: string?,
  clientEmail: string?,
  clientPhone: string?,
  propertyId: string?,
  propertyTitle: string?,
  mode: string,                  // presencial | online
  status: string,                // pending | confirmed | cancelled
  notes: string?
}
```

---

## 8. Financial Messages Collection

**Path**: `/financial_messages/{messageId}`

**Access**: Owner and admin/finance managers

### Document Structure

```typescript
{
  id: string,
  userId: string,
  userName: string,
  userEmail: string,
  message: string,
  financialData: object,         // Encrypted financial information
  analysisScore: number,
  riskLevel: string,
  debtToIncome: number,
  loanToValue: number,
  recommendedInstitutions: string[],
  summary: string,
  createdAt: Timestamp,
  analysisCompletedAt: Timestamp?,
  sharedWithInstitutions: boolean
}
```

---

## Query Patterns

### Properties

```javascript
// Get all active properties
firestore.collection('properties')
  .where('isActive', '==', true)
  .orderBy('updatedAt', 'desc')
  .limit(100)

// Filter by category
firestore.collection('properties')
  .where('category', '==', 'apartamento')
  .orderBy('updatedAt', 'desc')
  .limit(50)

// Filter by rental type
firestore.collection('properties')
  .where('rentalType', '==', 'sale')
  .orderBy('price', 'asc')
```

### Blog Posts

```javascript
// Featured posts by priority
firestore.collection('blog_posts')
  .where('isFeatured', '==', true)
  .orderBy('priority', 'desc')
  .orderBy('publishedAt', 'desc')
  .limit(5)

// Posts by tag
firestore.collection('blog_posts')
  .where('tags', 'array-contains', 'investimento')
  .orderBy('publishedAt', 'desc')
```

### Leads

```javascript
// Recent leads
firestore.collection('leads')
  .orderBy('createdAt', 'desc')
  .limit(50)

// Leads by status
firestore.collection('leads')
  .where('status', '==', 'novo')
  .orderBy('createdAt', 'desc')
```

### Schedule Events

```javascript
// Agent's schedule
firestore.collection('schedule_events')
  .where('agentEmail', '==', 'ciencia@msn.com')
  .orderBy('start', 'asc')
  .limit(100)
```

---

## Best Practices

1. **Always use timestamps** (milliseconds since epoch) for dates in documents
2. **Include both createdAt and updatedAt** for audit trails
3. **Use subcollections sparingly** - they're harder to query across documents
4. **Denormalize when needed** - duplicate data to avoid complex joins
5. **Limit query results** - always use `.limit()` to avoid large reads
6. **Use batch writes** - for multiple document updates
7. **Index compound queries** - add to `firestore.indexes.json` before deploying

---

## Data Validation

While Firestore doesn't enforce schemas, your Flutter models handle validation:

- All models have `fromJson()` and `toJson()` methods
- Required fields will throw errors if missing
- Type checking is done at the model level
- Timestamps are converted to `DateTime` objects
- Enums are parsed safely with fallbacks

---

## Migration Notes

If you need to update the schema:

1. **Add new fields** - Always make them optional first
2. **Update existing documents** - Use batch writes or Cloud Functions
3. **Update security rules** - Deploy new rules before changing data
4. **Update indexes** - Deploy indexes before queries that need them
5. **Test thoroughly** - Use Firebase emulator for testing migrations

---

For more information, see `FIREBASE_SETUP.md`
