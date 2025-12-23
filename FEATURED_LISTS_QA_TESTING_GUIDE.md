# Featured Lists - QA Testing Guide

**Version:** 1.0
**Last Updated:** December 23, 2024
**Status:** Ready for Testing

---

## 📋 Overview

The **Featured Lists** feature allows super admins to create and manage custom product collections (e.g., "Best Selling", "Trending", "New Arrivals") that will be displayed to end users. This guide provides comprehensive testing scenarios for the QA team.

---

## 🔗 API Base URL

```
Production: https://api.epielio.com/api
Development: http://localhost:5000/api
```

---

## 🔐 Authentication Requirements

All admin endpoints require authentication with a valid admin JWT token in the request headers:

```
Authorization: Bearer <admin_token>
```

**Important:** Only **Super Admins** have access to Featured Lists management.

---

## 📍 API Endpoints Reference

### **Public Endpoints (No Authentication Required)**

#### 1. Get All Active Lists
```
GET /featured-lists
```

**Query Parameters:**
- `limit` (Number, Optional): Maximum products per list (default: 10)
- `region` (String, Optional): Filter by region (e.g., "india", "usa")

**Example:**
```
GET https://api.epielio.com/api/featured-lists?limit=5
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "listId": "550e8400-e29b-41d4-a716-446655440000",
      "listName": "Best Selling",
      "slug": "best-selling",
      "description": "Our top-selling products",
      "displayOrder": 1,
      "products": [...],
      "totalProducts": 5
    }
  ],
  "region": "india"
}
```

---

#### 2. Get Single List by Slug
```
GET /featured-lists/:slug
```

**Path Parameters:**
- `slug` (String, Required): List slug (e.g., "best-selling")

**Query Parameters:**
- `page` (Number, Optional): Page number (default: 1)
- `limit` (Number, Optional): Products per page (default: 20)
- `region` (String, Optional): Filter by region

**Example:**
```
GET https://api.epielio.com/api/featured-lists/best-selling?page=1&limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "listName": "Best Selling",
    "slug": "best-selling",
    "description": "Our top-selling products",
    "products": [...]
  },
  "pagination": {
    "current": 1,
    "pages": 3,
    "total": 25
  },
  "region": "india"
}
```

---

### **Admin Endpoints (Authentication Required)**

#### 3. Create New Featured List
```
POST /featured-lists/admin/lists
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "listName": "Summer Collection",
  "slug": "summer-collection",
  "description": "Hot products for the summer season",
  "isActive": true,
  "displayOrder": 5
}
```

**Required Fields:**
- `listName` (String): Display name
- `slug` (String): URL-friendly identifier (lowercase, hyphens only)

**Optional Fields:**
- `description` (String): Brief description
- `isActive` (Boolean): Active status (default: true)
- `displayOrder` (Number): Display order (default: 0)

**Expected Response:**
```json
{
  "success": true,
  "message": "Featured list created successfully",
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "listName": "Summer Collection",
    "slug": "summer-collection",
    "description": "Hot products for the summer season",
    "products": [],
    "isActive": true,
    "displayOrder": 5,
    "createdBy": "64f8a1b2c3d4e5f6a7b8c9d0",
    "createdByEmail": "admin@epielio.com",
    "createdAt": "2025-12-22T10:30:00.000Z"
  }
}
```

---

#### 4. Get All Lists (Admin View)
```
GET /featured-lists/admin/lists
```

**Query Parameters:**
- `page` (Number, Optional): Page number (default: 1)
- `limit` (Number, Optional): Lists per page (default: 20)
- `isActive` (Boolean, Optional): Filter by status
- `search` (String, Optional): Search by name or slug

**Example:**
```
GET https://api.epielio.com/api/featured-lists/admin/lists?page=1&limit=10&isActive=true&search=summer
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "listId": "550e8400-e29b-41d4-a716-446655440000",
      "listName": "Summer Collection",
      "slug": "summer-collection",
      "description": "Hot products for the summer season",
      "products": [...],
      "isActive": true,
      "displayOrder": 5,
      "createdAt": "2025-12-22T10:30:00.000Z",
      "updatedAt": "2025-12-22T11:45:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 2,
    "total": 15
  }
}
```

---

#### 5. Get Single List (Admin View)
```
GET /featured-lists/admin/lists/:listId
```

**Path Parameters:**
- `listId` (String, Required): List ID or slug

**Example:**
```
GET https://api.epielio.com/api/featured-lists/admin/lists/summer-collection
```

---

#### 6. Update List Details
```
PUT /featured-lists/admin/lists/:listId
```

**Request Body (All fields optional):**
```json
{
  "listName": "Summer Special 2025",
  "slug": "summer-special-2025",
  "description": "Updated collection for summer",
  "isActive": true,
  "displayOrder": 1
}
```

**Example:**
```
PUT https://api.epielio.com/api/featured-lists/admin/lists/summer-collection
```

---

#### 7. Delete List
```
DELETE /featured-lists/admin/lists/:listId
```

**Example:**
```
DELETE https://api.epielio.com/api/featured-lists/admin/lists/summer-collection
```

**Expected Response:**
```json
{
  "success": true,
  "message": "List deleted successfully"
}
```

---

#### 8. Add Product to List
```
POST /featured-lists/admin/lists/:listId/products
```

**Request Body:**
```json
{
  "productId": "PROD-001",
  "order": 5
}
```

**Required Fields:**
- `productId` (String): Product ID to add

**Optional Fields:**
- `order` (Number): Display order (auto-assigned if not provided)

**Example:**
```
POST https://api.epielio.com/api/featured-lists/admin/lists/summer-collection/products
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product added to list successfully",
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "listName": "Summer Collection",
    "products": [
      {
        "productId": "PROD-001",
        "order": 1,
        "productName": "Premium Smartphone",
        "productImage": "https://cdn.epielio.com/products/phone.jpg",
        "price": 49999,
        "finalPrice": 44999,
        "lastSynced": "2025-12-22T10:30:00.000Z"
      }
    ]
  }
}
```

**Note:** Orders are automatically normalized (e.g., [1, 5, 10] → [1, 2, 3])

---

#### 9. Remove Product from List
```
DELETE /featured-lists/admin/lists/:listId/products/:productId
```

**Path Parameters:**
- `listId` (String, Required): List ID or slug
- `productId` (String, Required): Product ID to remove

**Example:**
```
DELETE https://api.epielio.com/api/featured-lists/admin/lists/summer-collection/products/PROD-001
```

---

#### 10. Reorder Products
```
PUT /featured-lists/admin/lists/:listId/reorder
```

**Request Body:**
```json
{
  "products": [
    { "productId": "PROD-003", "order": 1 },
    { "productId": "PROD-001", "order": 10 },
    { "productId": "PROD-002", "order": 5 }
  ]
}
```

**Example:**
```
PUT https://api.epielio.com/api/featured-lists/admin/lists/summer-collection/reorder
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Products reordered successfully",
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "listName": "Summer Collection",
    "products": [
      {
        "productId": "PROD-003",
        "order": 1,
        "productName": "Product 3"
      },
      {
        "productId": "PROD-002",
        "order": 2,
        "productName": "Product 2"
      },
      {
        "productId": "PROD-001",
        "order": 3,
        "productName": "Product 1"
      }
    ]
  }
}
```

**Note:** Orders are automatically normalized to sequential numbers.

---

#### 11. Sync Single Product Data
```
POST /featured-lists/admin/lists/:listId/products/:productId/sync
```

**Example:**
```
POST https://api.epielio.com/api/featured-lists/admin/lists/summer-collection/products/PROD-001/sync
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product synced successfully",
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "products": [...]
  }
}
```

---

#### 12. Sync All Products in List
```
POST /featured-lists/admin/lists/:listId/sync-all
```

**Example:**
```
POST https://api.epielio.com/api/featured-lists/admin/lists/summer-collection/sync-all
```

**Expected Response:**
```json
{
  "success": true,
  "message": "All products synced successfully",
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "products": [...]
  }
}
```

---

## 🧪 Test Scenarios

### **1. List Management Tests**

#### Test Case 1.1: Create New List - Success
**Steps:**
1. Login as super admin
2. Navigate to Featured Lists page
3. Click "Create New List"
4. Fill in all required fields:
   - List Name: "Test List"
   - Slug: "test-list"
   - Description: "Test description"
   - Display Order: 1
   - Status: Active
5. Click "Save List"

**Expected Result:**
- Success notification appears
- New list appears in the lists container
- List is expandable/collapsible
- Stats are updated

---

#### Test Case 1.2: Create List - Duplicate Slug
**Steps:**
1. Try to create a list with an existing slug

**Expected Result:**
- Error message: "A list with this slug already exists"
- List is not created

---

#### Test Case 1.3: Create List - Invalid Slug Format
**Steps:**
1. Try to create a list with invalid slug (e.g., "Test List!", "test_list")

**Expected Result:**
- Client-side validation error
- Error message: "Slug must contain only lowercase letters, numbers, and hyphens"

---

#### Test Case 1.4: Edit Existing List
**Steps:**
1. Expand a list
2. Click "Edit" button
3. Modify list details
4. Click "Save List"

**Expected Result:**
- Success notification
- List details are updated
- Changes reflect immediately

---

#### Test Case 1.5: Delete List
**Steps:**
1. Expand a list
2. Click "Delete" button
3. Confirm deletion in modal

**Expected Result:**
- Confirmation modal appears
- After confirmation, list is removed
- Success notification appears
- Stats are updated

---

### **2. Product Management Tests**

#### Test Case 2.1: Add Product to List - Success
**Steps:**
1. Expand a list
2. Click "Add Product"
3. Search for a product
4. Select a product from results
5. Optionally enter display order
6. Click "Add Product"

**Expected Result:**
- Product search shows results
- Selected product is highlighted
- Product is added to the list
- Success notification appears
- Product appears in the list with correct order

---

#### Test Case 2.2: Add Product - Already Exists
**Steps:**
1. Try to add a product that's already in the list

**Expected Result:**
- Error message: "Product already exists in this list"

---

#### Test Case 2.3: Add Product - Invalid Product ID
**Steps:**
1. Try to add a non-existent product ID

**Expected Result:**
- Error message: "Product not found"

---

#### Test Case 2.4: Remove Product from List
**Steps:**
1. Expand a list with products
2. Click trash icon on a product
3. Confirm deletion

**Expected Result:**
- Confirmation modal appears
- Product is removed from list
- Success notification
- Other products remain

---

#### Test Case 2.5: Move Product Up
**Steps:**
1. Expand a list with multiple products
2. Click up arrow on a product (not first)

**Expected Result:**
- Product moves up one position
- Order is swapped with product above
- Success notification
- List is refreshed

---

#### Test Case 2.6: Move Product Down
**Steps:**
1. Expand a list with multiple products
2. Click down arrow on a product (not last)

**Expected Result:**
- Product moves down one position
- Order is swapped with product below
- Success notification
- List is refreshed

---

#### Test Case 2.7: Move Product Up - First Product
**Steps:**
1. Try to move first product up

**Expected Result:**
- Up button is disabled
- No action occurs

---

#### Test Case 2.8: Move Product Down - Last Product
**Steps:**
1. Try to move last product down

**Expected Result:**
- Down button is disabled
- No action occurs

---

### **3. Sync Tests**

#### Test Case 3.1: Sync Single Product
**Steps:**
1. Expand a list
2. Click sync icon on a product

**Expected Result:**
- Loading indicator
- Product data is refreshed
- Success notification
- Last synced timestamp is updated

---

#### Test Case 3.2: Sync All Products
**Steps:**
1. Expand a list
2. Click "Sync All" button

**Expected Result:**
- Loading overlay appears
- All products are refreshed
- Success notification
- All timestamps are updated

---

### **4. Search & Filter Tests**

#### Test Case 4.1: Search Lists by Name
**Steps:**
1. Enter a list name in search box
2. Wait for debounce

**Expected Result:**
- Only matching lists are displayed
- Search is case-insensitive
- Empty state if no matches

---

#### Test Case 4.2: Search Lists by Slug
**Steps:**
1. Enter a slug in search box

**Expected Result:**
- Lists with matching slugs are displayed

---

#### Test Case 4.3: Filter by Active Status
**Steps:**
1. Select "Active" from status filter

**Expected Result:**
- Only active lists are shown

---

#### Test Case 4.4: Filter by Inactive Status
**Steps:**
1. Select "Inactive" from status filter

**Expected Result:**
- Only inactive lists are shown

---

#### Test Case 4.5: Combined Search and Filter
**Steps:**
1. Enter search term
2. Select status filter

**Expected Result:**
- Both filters are applied
- Results match both criteria

---

### **5. UI/UX Tests**

#### Test Case 5.1: Accordion Expand/Collapse
**Steps:**
1. Click on a list header

**Expected Result:**
- List expands/collapses smoothly
- Chevron icon rotates
- Other lists remain in their state

---

#### Test Case 5.2: Empty State Display
**Steps:**
1. Ensure no lists exist (or filter to show none)

**Expected Result:**
- Empty state message appears
- "Create Your First List" button is visible
- No error messages

---

#### Test Case 5.3: Loading States
**Steps:**
1. Perform any async operation

**Expected Result:**
- Loading overlay appears
- User cannot interact during loading
- Loading disappears after operation

---

#### Test Case 5.4: Notifications
**Steps:**
1. Perform various operations

**Expected Result:**
- Success operations show green notification
- Errors show red notification
- Notifications auto-dismiss after 5 seconds
- Notifications are dismissible manually

---

#### Test Case 5.5: Modal Behaviors
**Steps:**
1. Open various modals
2. Try closing with X button
3. Try closing with Cancel button
4. Try closing with backdrop click

**Expected Result:**
- All close methods work
- Form data is cleared when closing
- Modals don't stack

---

### **6. Responsive Design Tests**

#### Test Case 6.1: Desktop View (1920x1080)
**Expected Result:**
- All elements are properly aligned
- No horizontal scrolling
- Cards display in grid

---

#### Test Case 6.2: Tablet View (768x1024)
**Expected Result:**
- Layout adjusts appropriately
- Buttons remain accessible
- Cards stack if needed

---

#### Test Case 6.3: Mobile View (375x667)
**Expected Result:**
- Single column layout
- Touch-friendly button sizes
- Horizontal scrolling prevented
- All functionality accessible

---

### **7. Permission & Security Tests**

#### Test Case 7.1: Super Admin Access
**Steps:**
1. Login as super admin
2. Check sidebar

**Expected Result:**
- Featured Lists menu is visible
- Page is accessible

---

#### Test Case 7.2: Sub-Admin Access Denied
**Steps:**
1. Login as sub-admin (without featured_lists permission)
2. Try to access Featured Lists

**Expected Result:**
- Menu item is not visible in sidebar
- Direct URL access shows "Access Denied" alert
- Redirected to dashboard

---

#### Test Case 7.3: Unauthenticated Access
**Steps:**
1. Logout
2. Try to access /pages/featured-lists.html

**Expected Result:**
- Redirected to login page

---

#### Test Case 7.4: Invalid Token
**Steps:**
1. Modify token in localStorage
2. Try to perform operations

**Expected Result:**
- API returns 401 Unauthorized
- Error notification appears

---

### **8. Error Handling Tests**

#### Test Case 8.1: Network Error
**Steps:**
1. Disconnect internet
2. Try to load lists

**Expected Result:**
- Error notification appears
- User-friendly error message
- No crash

---

#### Test Case 8.2: 500 Server Error
**Steps:**
1. Trigger a server error (if possible in test environment)

**Expected Result:**
- Error notification appears
- Error is logged to console
- Application remains functional

---

#### Test Case 8.3: Malformed Response
**Steps:**
1. Mock a malformed API response

**Expected Result:**
- Graceful error handling
- No UI break
- Error notification

---

### **9. Performance Tests**

#### Test Case 9.1: Large Lists (100+ products)
**Expected Result:**
- Page loads without lag
- Scrolling is smooth
- No memory leaks

---

#### Test Case 9.2: Multiple Lists (50+)
**Expected Result:**
- Initial load is reasonable (<3 seconds)
- Search/filter is responsive
- Accordion works smoothly

---

### **10. Auto-Sync Tests**

#### Test Case 10.1: Product Update Auto-Sync
**Steps:**
1. Add a product to a list
2. Update that product's details (price, name, etc.)
3. Refresh the featured list

**Expected Result:**
- Product data is automatically updated
- Changes reflect in the list

---

#### Test Case 10.2: Product Delete Auto-Sync
**Steps:**
1. Add a product to a list
2. Delete that product from products page
3. Refresh the featured list

**Expected Result:**
- Product is automatically removed from all lists

---

## 🐛 Common Error Messages

| Error Code | Message | Cause |
|------------|---------|-------|
| 400 | "Please fill in all required fields" | Missing listName or slug |
| 400 | "Slug must contain only lowercase letters, numbers, and hyphens" | Invalid slug format |
| 400 | "A list with this slug already exists" | Duplicate slug |
| 400 | "Product already exists in this list" | Duplicate product |
| 401 | "Authentication token required" | Missing or invalid token |
| 403 | "Access denied. Admin role required." | Non-admin user |
| 404 | "List not found" | Invalid listId |
| 404 | "Product not found" | Invalid productId |
| 500 | "Internal Server Error" | Server-side issue |

---

## 📊 Success Criteria

- ✅ All test cases pass
- ✅ No console errors
- ✅ Responsive on all devices
- ✅ No security vulnerabilities
- ✅ Performance benchmarks met
- ✅ All CRUD operations work correctly
- ✅ Proper error handling
- ✅ User-friendly notifications
- ✅ RBAC enforced correctly

---

## 📝 Test Report Template

```
Test Session: [Date/Time]
Tester: [Name]
Environment: [Production/Staging/Dev]
Browser: [Chrome/Firefox/Safari]
OS: [Windows/Mac/Linux]

Test Results:
- Total Test Cases: [X]
- Passed: [X]
- Failed: [X]
- Blocked: [X]

Failed Test Cases:
1. [Test Case ID] - [Issue Description]

Bugs Found:
1. [Bug Title] - [Severity] - [Steps to Reproduce]

Notes:
[Additional observations]
```

---

## 🔧 Tools for Testing

- **Postman/Insomnia**: For API testing
- **Browser DevTools**: For network monitoring
- **React/Vue DevTools**: For state inspection (if applicable)
- **Lighthouse**: For performance testing
- **WAVE**: For accessibility testing

---

## 📞 Support

For issues or questions during testing:
- **Email:** dev@epielio.com
- **Slack:** #qa-support
- **Documentation:** FEATURED_LISTS_ADMIN_GUIDE.md

---

**Happy Testing! 🚀**
