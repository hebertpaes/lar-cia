# Firebase Firestore Structure

Este documento descreve a estrutura de dados completa do Firestore para a plataforma Hebert Paes.

## Coleções Principais

### 1. `users` (Usuários)
**Privacidade**: Privado (usuário próprio + admin)

Campos:
- `id` (String): UID do Firebase Auth
- `name` (String): Nome completo
- `email` (String): Email
- `avatarUrl` (String?): URL da foto de perfil
- `isAdmin` (Boolean): Se é administrador
- `approved` (Boolean): Se cadastro foi aprovado pelo admin
- `accessLevel` (Int): 0=user, 1=moderator, 2=admin, 3=admin_full
- `permissions` (Map<String, Boolean>): Permissões granulares
  - `manageSites`: Gerenciar sites/conteúdo
  - `managePanels`: Gerenciar painéis
  - `approveUsers`: Aprovar usuários
  - `manageAds`: Gerenciar anúncios
  - `manageFinancing`: Gerenciar financiamento
- `preferredCategory` (String?): Categoria de interesse
- `phoneNumber` (String?): Telefone para WhatsApp
- `whatsappOptIn` (Boolean): Consentimento WhatsApp
- `creditAnalysisConsent` (Boolean): Consentimento análise de crédito
- `dataSharingConsent` (Boolean): Consentimento compartilhamento de dados

**Subcoleções:**
- `favorites`: Imóveis favoritos do usuário

**Regras de Segurança:**
- Create: Apenas o próprio usuário durante signup
- Read: Próprio usuário, admin, ou quem tem permissão approveUsers
- Update: Próprio usuário, admin, ou quem tem permissão approveUsers
- Delete: Apenas admin

---

### 2. `properties` (Imóveis)
**Privacidade**: Leitura pública, escrita admin/moderador

Campos:
- `id` (String): ID único
- `title` (String): Título do anúncio
- `location` (String): Localização
- `price` (Double): Preço
- `images` (List<String>): URLs das imagens
- `bedrooms` (Int): Quartos
- `bathrooms` (Int): Banheiros
- `garages` (Int?): Vagas
- `suites` (Int?): Suítes
- `category` (String): Categoria (casa, apartamento, etc.)
- `description` (String): Descrição completa
- `area` (Double): Área em m²
- `isFavorite` (Boolean): Se é favorito
- `rentalType` (String): sale, monthly, daily, seasonal
- `isActive` (Boolean): Se está ativo
- `createdAt` (Int): Timestamp de criação
- `updatedAt` (Int): Timestamp de atualização
- Geo:
  - `latitude` (Double?)
  - `longitude` (Double?)
  - `geoAccuracy` (Double?): Precisão em metros
  - `geoSource` (String?): device, map_picker, manual
  - `geoUpdatedAt` (Int?): Timestamp
- Building metadata:
  - `yearBuilt` (Int?)
  - `condoFee` (Double?): Condomínio R$
  - `proximities` (List<String>): Ex: ['Metro 500m']
- Verification:
  - `isVerified` (Boolean)
  - `verificationScore` (Double): 0.0 – 1.0
  - `proofUrls` (List<String>): Links de comprovação
  - `verificationNotes` (String)
  - `verifiedBy` (String): ai, manual, ''
  - `verifiedAt` (Int?)
- Ads/commercial:
  - `status` (String): draft, pending_payment, published, suspended
  - `ownerUserId` (String?)
  - `ownerEmail` (String?)
  - `termsAccepted` (Boolean)
  - `trialListing` (Boolean)
  - `trialEndsAt` (Int?)
  - `platformCommissionPercent` (Double): Ex: 0.025 = 2.5%
  - `paymentStatus` (String?): pending, succeeded, failed
  - `publishedAt` (Int?)
  - `adminApprovedAt` (Int?)

**Subcoleções:**
- `geoHistory`: Histórico de alterações de localização

**Índices necessários:**
- `isActive` + `updatedAt`
- `isActive` + `category` + `updatedAt`
- `isActive` + `rentalType` + `updatedAt`
- `isActive` + `title` + `updatedAt` (para busca por prefixo)
- `isActive` + `location` + `updatedAt` (para busca por prefixo)
- `status` + `updatedAt`
- `ownerUserId` + `updatedAt`

---

### 3. `blog_posts` (Posts do Blog)
**Privacidade**: Leitura pública, escrita admin

Campos:
- `id` (String): ID único
- `slug` (String): Slug para URL
- `title` (String): Título
- `subtitle` (String): Subtítulo
- `excerpt` (String): Resumo
- `body` (String): Conteúdo em markdown
- `tags` (List<String>): Tags
- `heroImageUrl` (String): Imagem principal
- `imageCredit` (String): Crédito da imagem
- `authorName` (String): Nome do autor
- `publishedAt` (Int): Timestamp de publicação
- `updatedAt` (Int): Timestamp de atualização
- `feedbacks` (List<Map>): Array de feedbacks inline
- `isFeatured` (Boolean): Se é destaque
- `sourceUrls` (List<String>): Citações/referências
- Scheduling:
  - `priority` (Int): Prioridade (maior primeiro)
  - `scheduledFrom` (Int?): Mostrar após esta data
  - `scheduledTo` (Int?): Mostrar até esta data
- Backend/SEO:
  - `status` (String): published, draft, scheduled
  - `html` (String): HTML cached
  - `plaintext` (String): Texto plano cached
  - `readMinutes` (Int): Tempo de leitura estimado
  - `views` (Int): Contador de visualizações
  - `authorId` (String?): Link para coleção authors
  - `canonicalUrl` (String): URL canônica
  - `tagsNormalized` (List<String>): Tags normalizadas
  - `searchTokens` (List<String>): Tokens para busca

**Índices necessários:**
- `status` + `publishedAt`
- `status` + `isFeatured` + `publishedAt`
- `isFeatured` + `publishedAt`
- `priority` + `publishedAt`
- `tagsNormalized` (array-contains) + `publishedAt`

---

### 4. `leads` (Leads/Contatos)
**Privacidade**: Privado para admin e usuários com permissão

Campos:
- `id` (String): ID único
- `name` (String): Nome
- `email` (String): Email
- `phone` (String): Telefone
- `role` (String): cliente, anunciante, investidor, etc.
- `intent` (String): comprar, alugar, anunciar, etc.
- `source` (String): home, blog, property
- `isPep` (Boolean): Pessoa politicamente exposta
- `hasElectronicLocks` (Boolean): Tem fechaduras eletrônicas
- `wantsFinancing` (Boolean): Quer financiamento
- `status` (String): novo, contatado, qualificado, ganho, perdido
- `createdAt` (Int): Timestamp
- `updatedAt` (Int): Timestamp
- `notes` (String?): Observações

**Índices necessários:**
- `status` + `createdAt`
- `role` + `createdAt`

---

### 5. `financing_applications` (Solicitações de Financiamento)
**Privacidade**: Privado para o usuário e admin

Campos:
- `id` (String): ID único
- `userId` (String): ID do usuário
- `name` (String): Nome
- `email` (String): Email
- `phone` (String): Telefone
- `monthlyIncome` (Double?): Renda mensal
- `propertyId` (String?): ID do imóvel (opcional)
- `source` (String): home, property, blog
- `blogSlug` (String?): Slug do blog
- `isPep` (Boolean): Pessoa politicamente exposta
- `createdAt` (Int): Timestamp
- `status` (String): prospect, client, rejected
- `selectedBank` (String?): Banco selecionado
- `wantsInsurance` (Boolean): Quer seguro
- Pre-registration:
  - `cpf` (String?)
  - `profilePhotoDataUrl` (String?): Foto de perfil (data URL)
  - `documentDataUrls` (List<String>?): Documentos (RG, etc.)
  - `videoUrl` (String?): URL do vídeo

**Índices necessários:**
- `userId` + `createdAt`
- `status` + `createdAt`

---

### 6. `schedule_events` (Eventos Agendados)
**Privacidade**: Privado para agente, cliente e admin

Campos:
- `id` (String): ID único
- `title` (String): Título do evento
- `start` (Int): Timestamp de início
- `end` (Int): Timestamp de fim
- `agentEmail` (String): Email do corretor
- `clientName` (String?): Nome do cliente
- `clientEmail` (String?): Email do cliente
- `clientPhone` (String?): Telefone do cliente
- `propertyId` (String?): ID do imóvel
- `propertyTitle` (String?): Título do imóvel
- `mode` (String): presencial, online
- `status` (String): pending, confirmed, cancelled
- `notes` (String?): Observações

**Índices necessários:**
- `agentEmail` + `start`
- `agentEmail` + `status` + `start`
- `clientEmail` + `start`

---

### 7. `property_reviews` (Avaliações de Imóveis)
**Privacidade**: Leitura pública, escrita usuário autenticado

Campos:
- `id` (String): ID único
- `propertyId` (String): ID do imóvel
- `authorId` (String): ID do autor
- `authorName` (String): Nome do autor
- `rating` (Int): 1 a 5
- `comment` (String): Comentário
- `createdAt` (Int): Timestamp

**Índices necessários:**
- `propertyId` + `createdAt`

---

### 8. `financial_messages` (Mensagens Financeiras)
**Privacidade**: Privado para usuário e admin

Campos:
- `id` (String): ID único
- `userId` (String): ID do usuário
- `applicationId` (String): ID da aplicação
- `sender` (String): Remetente
- `message` (String): Mensagem
- `sentAt` (Int): Timestamp
- `isRead` (Boolean): Se foi lida

**Índices necessários:**
- `applicationId` + `sentAt`
- `userId` + `createdAt`

---

### 9. Coleções Auxiliares

#### `settings`
- **Privacidade**: Leitura pública, escrita admin
- Configurações gerais da aplicação

#### `property_categories`
- **Privacidade**: Leitura pública, escrita admin
- Categorias de imóveis

#### `blog_categories`
- **Privacidade**: Leitura pública, escrita admin
- Categorias de blog

#### `blog_slugs`
- **Privacidade**: Leitura pública, escrita admin
- Reserva de slugs únicos para posts

#### `wa_templates`
- **Privacidade**: Admin apenas
- Templates de mensagens WhatsApp

#### `wa_jobs`
- **Privacidade**: Admin apenas
- Jobs de automação WhatsApp

#### `whatsapp_campaigns`
- **Privacidade**: Admin apenas
- Campanhas WhatsApp

#### `newsletter_subscribers`
- **Privacidade**: Create público, manage admin
- Assinantes da newsletter

#### `events`
- **Privacidade**: Write público (analytics), read admin
- Eventos de analytics

#### `payments`
- **Privacidade**: Privado para usuário e admin
- Pagamentos e assinaturas

#### `financial_institution_reports`
- **Privacidade**: Admin e finance managers
- Relatórios de instituições financeiras

---

## Regras de Segurança

### Funções Auxiliares
- `isSignedIn()`: Verifica se o usuário está autenticado
- `isAdmin()`: Verifica se o usuário é admin
- `isOwner(ownerId)`: Verifica se o usuário é dono do documento
- `isApproved()`: Verifica se o cadastro foi aprovado
- `hasPermission(permission)`: Verifica permissão específica

### Padrões de Acesso
1. **Privado**: Apenas o dono + admin (ex: users, financing_applications)
2. **Signed-in**: Apenas usuários autenticados (ex: schedule_events)
3. **Público**: Todos podem ler (ex: properties, blog_posts)
4. **Admin-only**: Apenas admin pode gerenciar (ex: settings, wa_templates)

---

## Deployment

Para deployar as regras e índices:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Para visualizar no console:
- Rules: https://console.firebase.google.com/project/hebert-paes-platform/firestore/rules
- Indexes: https://console.firebase.google.com/project/hebert-paes-platform/firestore/indexes

---

## Observações Importantes

1. **Todos os timestamps** são armazenados como `millisecondsSinceEpoch` (Int) para compatibilidade
2. **IDs auto-gerados** pelo Firestore garantem unicidade
3. **Slugs únicos** para posts são garantidos pela coleção `blog_slugs`
4. **Geo queries** requerem GeoPoint ou campos lat/lng separados + índices
5. **Busca por texto** usa arrays de tokens (`searchTokens`) por limitações do Firestore
6. **Subcoleções** são usadas para relacionamentos 1:N (ex: users/{id}/favorites)

---

## Manutenção

- Limpar `blog_slugs` órfãos periodicamente
- Arquivar `schedule_events` antigos (>6 meses)
- Agregar `analytics events` mensalmente
- Backup automático via Firebase console
