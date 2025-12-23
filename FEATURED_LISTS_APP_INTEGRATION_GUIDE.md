# Featured Lists - App Team Integration Guide

**Version:** 1.0
**Last Updated:** December 23, 2024
**Status:** Ready for Integration

---

## 📋 Overview

The **Featured Lists API** allows you to display custom product collections (e.g., "Best Selling", "Trending", "New Arrivals") in your mobile/web application. Admins create and manage these lists, and your app consumes them via public endpoints.

---

## 🌐 API Base URL

```
Production: https://api.epielio.com/api
Development: http://localhost:5000/api
```

---

## 🔓 Public Endpoints (No Authentication Required)

These endpoints can be accessed directly from your app without authentication.

---

### 1️⃣ Get All Active Featured Lists

**Endpoint:**
```
GET /featured-lists
```

**Description:** Retrieves all active featured lists with their products. Products are automatically filtered based on the user's region.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | Number | No | 10 | Maximum products to return per list |
| `region` | String | No | Auto-detected | Manually specify region (e.g., "india", "usa") |

**Example Request:**
```javascript
// Fetch all lists with 5 products each
GET https://api.epielio.com/api/featured-lists?limit=5

// Fetch with specific region
GET https://api.epielio.com/api/featured-lists?limit=5&region=india
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "listId": "550e8400-e29b-41d4-a716-446655440000",
      "listName": "Best Selling",
      "slug": "best-selling",
      "description": "Our top-selling products this month",
      "displayOrder": 1,
      "products": [
        {
          "productId": "PROD-001",
          "order": 1,
          "productName": "Premium Smartphone",
          "productImage": "https://cdn.epielio.com/products/phone.jpg",
          "price": 49999,
          "finalPrice": 44999,
          "lastSynced": "2025-12-22T10:30:00.000Z"
        },
        {
          "productId": "PROD-002",
          "order": 2,
          "productName": "Wireless Earbuds",
          "productImage": "https://cdn.epielio.com/products/earbuds.jpg",
          "price": 8999,
          "finalPrice": 7499,
          "lastSynced": "2025-12-22T10:30:00.000Z"
        }
      ],
      "totalProducts": 5
    },
    {
      "listId": "550e8400-e29b-41d4-a716-446655440001",
      "listName": "Trending Now",
      "slug": "trending-now",
      "description": "Hottest products right now",
      "displayOrder": 2,
      "products": [...],
      "totalProducts": 8
    }
  ],
  "region": "india"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether the request was successful |
| `data` | Array | Array of featured lists |
| `data[].listId` | String | Unique list identifier |
| `data[].listName` | String | Display name of the list |
| `data[].slug` | String | URL-friendly identifier |
| `data[].description` | String | Brief description of the list |
| `data[].displayOrder` | Number | Order in which lists should appear |
| `data[].products` | Array | Array of products in this list |
| `data[].totalProducts` | Number | Total products in this list |
| `region` | String | Region used for filtering |

**Product Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `productId` | String | Unique product identifier |
| `order` | Number | Display order within the list |
| `productName` | String | Product name |
| `productImage` | String | Product image URL |
| `price` | Number | Regular price (in smallest currency unit, e.g., paise) |
| `finalPrice` | Number | Final price after discounts |
| `lastSynced` | String (ISO 8601) | Last time product data was synced |

**Use Cases:**
- Display on homepage (e.g., "Best Selling", "Trending")
- Show multiple curated collections
- Filter by region automatically

---

### 2️⃣ Get Single Featured List by Slug

**Endpoint:**
```
GET /featured-lists/:slug
```

**Description:** Retrieves a specific featured list with paginated products.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | String | Yes | URL-friendly list identifier (e.g., "best-selling") |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 20 | Products per page |
| `region` | String | No | Auto-detected | Manually specify region |

**Example Requests:**
```javascript
// Get first page with 10 products
GET https://api.epielio.com/api/featured-lists/best-selling?page=1&limit=10

// Get second page
GET https://api.epielio.com/api/featured-lists/best-selling?page=2&limit=10

// Get with specific region
GET https://api.epielio.com/api/featured-lists/trending-now?region=usa&limit=20
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "listId": "550e8400-e29b-41d4-a716-446655440000",
    "listName": "Best Selling",
    "slug": "best-selling",
    "description": "Our top-selling products",
    "products": [
      {
        "productId": "PROD-001",
        "order": 1,
        "productName": "Premium Smartphone",
        "productImage": "https://cdn.epielio.com/products/phone.jpg",
        "price": 49999,
        "finalPrice": 44999
      },
      {
        "productId": "PROD-002",
        "order": 2,
        "productName": "Wireless Earbuds",
        "productImage": "https://cdn.epielio.com/products/earbuds.jpg",
        "price": 8999,
        "finalPrice": 7499
      }
    ]
  },
  "pagination": {
    "current": 1,
    "pages": 3,
    "total": 25
  },
  "region": "india"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Request success status |
| `data` | Object | Featured list data |
| `data.listId` | String | Unique list identifier |
| `data.listName` | String | Display name |
| `data.slug` | String | URL-friendly identifier |
| `data.description` | String | List description |
| `data.products` | Array | Array of products |
| `pagination` | Object | Pagination information |
| `pagination.current` | Number | Current page number |
| `pagination.pages` | Number | Total number of pages |
| `pagination.total` | Number | Total products in list |
| `region` | String | Region used for filtering |

**Use Cases:**
- Dedicated list page (e.g., "View All Best Selling")
- Infinite scroll implementation
- Category-like browsing experience

---

## 🔧 Implementation Examples

### **React/React Native Example**

#### Fetch All Lists for Homepage
```javascript
import React, { useEffect, useState } from 'react';

const FeaturedListsSection = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedLists();
  }, []);

  const fetchFeaturedLists = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://api.epielio.com/api/featured-lists?limit=5'
      );
      const data = await response.json();

      if (data.success) {
        setLists(data.data);
      } else {
        setError('Failed to load featured lists');
      }
    } catch (err) {
      setError('Error loading featured lists: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="featured-lists">
      {lists.map((list) => (
        <div key={list.listId} className="list-section">
          <h2>{list.listName}</h2>
          <p>{list.description}</p>

          <div className="products-grid">
            {list.products.map((product) => (
              <div key={product.productId} className="product-card">
                <img src={product.productImage} alt={product.productName} />
                <h3>{product.productName}</h3>
                <div className="price">
                  {product.price !== product.finalPrice && (
                    <span className="original-price">₹{product.price / 100}</span>
                  )}
                  <span className="final-price">₹{product.finalPrice / 100}</span>
                </div>
              </div>
            ))}
          </div>

          <a href={`/collections/${list.slug}`}>View All</a>
        </div>
      ))}
    </div>
  );
};

export default FeaturedListsSection;
```

---

#### Fetch Single List with Pagination
```javascript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const FeaturedListPage = () => {
  const { slug } = useParams(); // e.g., "best-selling"
  const [list, setList] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList(currentPage);
  }, [slug, currentPage]);

  const fetchList = async (page) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.epielio.com/api/featured-lists/${slug}?page=${page}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setList(data.data);
        setProducts(data.data.products);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error loading list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!list) return <div>List not found</div>;

  return (
    <div>
      <h1>{list.listName}</h1>
      <p>{list.description}</p>

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>

      {pagination && (
        <div className="pagination">
          <button onClick={handlePrevPage} disabled={currentPage === 1}>
            Previous
          </button>
          <span>Page {pagination.current} of {pagination.pages}</span>
          <button onClick={handleNextPage} disabled={currentPage === pagination.pages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FeaturedListPage;
```

---

### **Flutter/Dart Example**

#### Service Class
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class FeaturedListsService {
  static const String baseUrl = 'https://api.epielio.com/api';

  Future<List<FeaturedList>> getAllLists({int limit = 10, String? region}) async {
    try {
      final queryParams = {
        'limit': limit.toString(),
        if (region != null) 'region': region,
      };

      final uri = Uri.parse('$baseUrl/featured-lists')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((json) => FeaturedList.fromJson(json))
              .toList();
        }
      }
      throw Exception('Failed to load featured lists');
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  Future<FeaturedListDetail> getListBySlug(
    String slug, {
    int page = 1,
    int limit = 20,
    String? region,
  }) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'limit': limit.toString(),
        if (region != null) 'region': region,
      };

      final uri = Uri.parse('$baseUrl/featured-lists/$slug')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success']) {
          return FeaturedListDetail.fromJson(data);
        }
      }
      throw Exception('Failed to load list');
    } catch (e) {
      throw Exception('Error: $e');
    }
  }
}
```

#### Model Classes
```dart
class FeaturedList {
  final String listId;
  final String listName;
  final String slug;
  final String? description;
  final int displayOrder;
  final List<Product> products;
  final int totalProducts;

  FeaturedList({
    required this.listId,
    required this.listName,
    required this.slug,
    this.description,
    required this.displayOrder,
    required this.products,
    required this.totalProducts,
  });

  factory FeaturedList.fromJson(Map<String, dynamic> json) {
    return FeaturedList(
      listId: json['listId'],
      listName: json['listName'],
      slug: json['slug'],
      description: json['description'],
      displayOrder: json['displayOrder'],
      products: (json['products'] as List)
          .map((p) => Product.fromJson(p))
          .toList(),
      totalProducts: json['totalProducts'],
    );
  }
}

class Product {
  final String productId;
  final int order;
  final String productName;
  final String productImage;
  final int price;
  final int finalPrice;

  Product({
    required this.productId,
    required this.order,
    required this.productName,
    required this.productImage,
    required this.price,
    required this.finalPrice,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      productId: json['productId'],
      order: json['order'],
      productName: json['productName'],
      productImage: json['productImage'],
      price: json['price'],
      finalPrice: json['finalPrice'],
    );
  }
}

class FeaturedListDetail {
  final FeaturedList list;
  final Pagination pagination;
  final String region;

  FeaturedListDetail({
    required this.list,
    required this.pagination,
    required this.region,
  });

  factory FeaturedListDetail.fromJson(Map<String, dynamic> json) {
    return FeaturedListDetail(
      list: FeaturedList.fromJson(json['data']),
      pagination: Pagination.fromJson(json['pagination']),
      region: json['region'],
    );
  }
}

class Pagination {
  final int current;
  final int pages;
  final int total;

  Pagination({
    required this.current,
    required this.pages,
    required this.total,
  });

  factory Pagination.fromJson(Map<String, dynamic> json) {
    return Pagination(
      current: json['current'],
      pages: json['pages'],
      total: json['total'],
    );
  }
}
```

#### Widget Usage
```dart
import 'package:flutter/material.dart';

class FeaturedListsWidget extends StatefulWidget {
  @override
  _FeaturedListsWidgetState createState() => _FeaturedListsWidgetState();
}

class _FeaturedListsWidgetState extends State<FeaturedListsWidget> {
  final service = FeaturedListsService();
  List<FeaturedList> lists = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadLists();
  }

  Future<void> loadLists() async {
    try {
      final result = await service.getAllLists(limit: 5);
      setState(() {
        lists = result;
        loading = false;
      });
    } catch (e) {
      setState(() {
        loading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading lists: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Center(child: CircularProgressIndicator());
    }

    return ListView.builder(
      itemCount: lists.length,
      itemBuilder: (context, index) {
        final list = lists[index];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    list.listName,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  if (list.description != null)
                    Text(list.description!),
                ],
              ),
            ),
            SizedBox(
              height: 250,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: list.products.length,
                itemBuilder: (context, i) {
                  final product = list.products[i];
                  return ProductCard(product: product);
                },
              ),
            ),
            TextButton(
              onPressed: () {
                // Navigate to list detail page
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ListDetailPage(slug: list.slug),
                  ),
                );
              },
              child: Text('View All'),
            ),
          ],
        );
      },
    );
  }
}
```

---

### **Swift/iOS Example**

#### Service Class
```swift
import Foundation

struct FeaturedList: Codable {
    let listId: String
    let listName: String
    let slug: String
    let description: String?
    let displayOrder: Int
    let products: [Product]
    let totalProducts: Int
}

struct Product: Codable {
    let productId: String
    let order: Int
    let productName: String
    let productImage: String
    let price: Int
    let finalPrice: Int
}

struct FeaturedListsResponse: Codable {
    let success: Bool
    let data: [FeaturedList]
    let region: String
}

class FeaturedListsService {
    static let baseURL = "https://api.epielio.com/api"

    func getAllLists(limit: Int = 10, region: String? = nil, completion: @escaping (Result<[FeaturedList], Error>) -> Void) {
        var components = URLComponents(string: "\(FeaturedListsService.baseURL)/featured-lists")!

        var queryItems = [URLQueryItem(name: "limit", value: "\(limit)")]
        if let region = region {
            queryItems.append(URLQueryItem(name: "region", value: region))
        }
        components.queryItems = queryItems

        guard let url = components.url else {
            completion(.failure(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }

            do {
                let response = try JSONDecoder().decode(FeaturedListsResponse.self, from: data)
                if response.success {
                    completion(.success(response.data))
                } else {
                    completion(.failure(NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Request failed"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
```

---

## 📐 Price Format

**Important:** Prices are returned in the **smallest currency unit** (paise for INR, cents for USD).

**To display:**
```javascript
// JavaScript
const displayPrice = price / 100; // ₹499.99

// Dart
final displayPrice = price / 100; // ₹499.99

// Swift
let displayPrice = Double(price) / 100.0 // ₹499.99
```

---

## 🌍 Region Handling

### **Auto-Detection**
If you don't pass a `region` parameter, the API automatically detects the user's region based on:
- IP address
- User account settings
- Request headers

### **Manual Override**
```javascript
// Force India region
GET /featured-lists?region=india

// Force USA region
GET /featured-lists?region=usa
```

### **Supported Regions**
- `india`
- `usa`
- `uk`
- `uae`
- (Check with backend team for complete list)

---

## 🎨 UI/UX Best Practices

### **1. Homepage Implementation**
```
┌─────────────────────────────────────────┐
│                                         │
│  [Hero Banner]                          │
│                                         │
├─────────────────────────────────────────┤
│  Best Selling                   View All│
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ Img │ │ Img │ │ Img │ │ Img │ →     │
│  │ Name│ │ Name│ │ Name│ │ Name│       │
│  │ ₹999│ │ ₹999│ │ ₹999│ │ ₹999│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────────────┤
│  Trending Now               View All    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ Img │ │ Img │ │ Img │ │ Img │ →     │
│  │ Name│ │ Name│ │ Name│ │ Name│       │
│  │ ₹999│ │ ₹999│ │ ₹999│ │ ₹999│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────┘
```

**Recommendations:**
- Show 4-6 products per list on mobile
- Use horizontal scrolling for products
- Show "View All" link for each list
- Display lists in `displayOrder` sequence

### **2. List Detail Page**
```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│                                         │
│  Best Selling Products                  │
│  Our top-selling items this month       │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ Img │ │ Img │ │ Img │               │
│  │ Name│ │ Name│ │ Name│               │
│  │ ₹999│ │ ₹999│ │ ₹999│               │
│  └─────┘ └─────┘ └─────┘               │
│                                         │
│  [Load More] or [Pagination]            │
└─────────────────────────────────────────┘
```

**Recommendations:**
- Implement pagination or infinite scroll
- Show grid view (2-3 columns on mobile)
- Display list name and description
- Add breadcrumbs for navigation

---

## ⚠️ Error Handling

### **Common Errors**

```javascript
// List not found
{
  "success": false,
  "message": "List not found"
}

// Network error
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
} catch (error) {
  console.error('Network error:', error);
  // Show user-friendly message
}

// Empty lists
{
  "success": true,
  "data": []
}
// Display: "No featured lists available"
```

### **Recommended Error Messages**

| Scenario | User Message |
|----------|--------------|
| Network error | "Unable to load products. Please check your connection." |
| Empty lists | "No featured collections available right now." |
| List not found | "This collection is no longer available." |
| Server error | "Something went wrong. Please try again later." |

---

## 🚀 Performance Optimization

### **1. Caching Strategy**
```javascript
// Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

const cachedData = {
  timestamp: null,
  data: null
};

async function getFeaturedLists() {
  const now = Date.now();

  if (cachedData.data && (now - cachedData.timestamp) < CACHE_DURATION) {
    return cachedData.data;
  }

  const response = await fetch('https://api.epielio.com/api/featured-lists');
  const data = await response.json();

  cachedData.data = data;
  cachedData.timestamp = now;

  return data;
}
```

### **2. Image Optimization**
```javascript
// Use CDN image transformations if available
const optimizedImageUrl = `${product.productImage}?w=300&h=300&q=80`;
```

### **3. Lazy Loading**
```javascript
// Load images only when visible
<img
  src={product.productImage}
  loading="lazy"
  alt={product.productName}
/>
```

---

## 🧪 Testing Checklist

- [ ] Homepage displays all active lists
- [ ] Products show correct images and prices
- [ ] "View All" links work correctly
- [ ] List detail page loads properly
- [ ] Pagination/infinite scroll works
- [ ] Region filtering works (if implemented)
- [ ] Empty states display correctly
- [ ] Error handling works
- [ ] Images load properly
- [ ] Prices display correctly (divided by 100)
- [ ] Responsive on all screen sizes

---

## 📊 Analytics Tracking

**Recommended Events:**

```javascript
// Track list view
analytics.track('Featured List Viewed', {
  listId: list.listId,
  listName: list.listName,
  slug: list.slug,
  productCount: list.products.length
});

// Track product click from list
analytics.track('Featured Product Clicked', {
  listId: list.listId,
  listName: list.listName,
  productId: product.productId,
  productName: product.productName,
  position: product.order
});

// Track "View All" click
analytics.track('Featured List View All Clicked', {
  listId: list.listId,
  listName: list.listName
});
```

---

## 🔄 Auto-Sync Behavior

**Important:** Product data in featured lists is automatically synced when:
- Product name changes
- Product price changes
- Product images change
- Product is deleted (automatically removed from all lists)

**You don't need to handle this** - it happens automatically on the backend.

---

## 📞 Support & Questions

**For integration help:**
- **Email:** dev@epielio.com
- **Slack:** #app-team-support
- **Documentation:** FEATURED_LISTS_ADMIN_GUIDE.md

**For reporting API issues:**
- **Email:** backend@epielio.com
- **Slack:** #api-support

---

## 📝 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 23, 2024 | Initial release |

---

## 🎯 Quick Start Checklist

- [ ] Read this documentation
- [ ] Test endpoints in Postman/Insomnia
- [ ] Implement homepage featured lists
- [ ] Implement list detail pages
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test on all devices
- [ ] Add analytics tracking
- [ ] Deploy to staging
- [ ] Get QA approval
- [ ] Deploy to production

---

**Happy Coding! 🚀**
