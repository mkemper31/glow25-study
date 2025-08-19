'use strict';

import express from 'express';
import cors from 'cors';
import { createConnection } from 'mysql';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

const app = express();
app.use(cors());
const port = 3000;

/**
 * Sets up shopify API.
 * Values are placeholders, and would need to be replaced with actual credentials.
 * In a production environment, these should be stored in environment variables for security.
 * Scopes are set to read customers and products, which allows the app to fetch customer details and product information.
 */
const shopify = shopifyApi({
    apiKey : 'APIKeyExample',
    apiSecretKey : 'APISecretKeyExample',
    scopes : ['read_customers', 'read_products'],
    hostName : 'case-study-host',
    apiVersion : LATEST_API_VERSION
});

// Sets up a session for the Shopify API and creates a GraphQL client.
const session = shopify.session.customAppSession('case-study-store.myshopify.com');
const client = new shopify.clients.Graphql({ session });


/**
 * Sets up MySQL connection.
 * The connection parameters are placeholders and should be replaced with actual database credentials.
 * In production, should use environment variables for security.
 * 
 * The schema used here is assumed to have a "users" table.
 * It is assumbed to have the following columns:
 * - shopify_customer_id: ID of the customer in Shopify, used to fetch customer details from the Shopify API
 * - favorite_product_id: Shopify ID of the user's favorite product in the local database
 */
const db = createConnection({
    host: 'localhost',
    user: 'db_user',
    password: 'password_placeholder',
    database: 'case_study_db',
    port: 3306,
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});


/**
 * This endpoint is set up to receive GET requests from the Shopify app proxy.
 * It expect s query parameter 'user_id' to identify the user.
 * The app proxy should be configured in the Shopify admin dahsboard to point to this endpoint.
 */
app.get('/users', (req, res) => {
    const userId = req.query['user_id'];
    if (!userId) {
        return res.status(400).json({ error: 'Missing user_id query parameter' });
    }

    /**
     * Initial step is to fetch customer data from Shopify using the provided userId.
     * The userId corresponds to the shopify_customer_id in the local database.
     * This is done using the fetchCustomerData function, which queries the Shopify API.
     * If the customer is not found, it returns a 404 error.
     */
    fetchCustomerData(userId).then((customerData) => {
        if (!customerData) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const { firstName, image: profileImage } = customerData;
        /**
         * Once the customer data is retrieved, the next step is to fetch the user's favorite product.
         * This is done by querying the local MySQL database using the shopify_customer_id.
         * 
         * In a production environment, favorite products could be derived from user preferences or interactions.
         * Here, it is assumed that the favorite_product_id is stored in the users table for demonstration purposes.
         */
        db.query(`SELECT
                        users.favorite_product_id AS favorite_product_id
                    FROM users
                    WHERE users.shopify_customer_id = ?`,
                    [userId],
                    (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Favorite product not found' });
            }
            
            const favoriteProductId = results[0]?.favorite_product_id;

            /**
             * Once the favorite_product_id is retrieved, the next step is to fetch product data from Shopify.
             * This is done using the fetchProductData function, which queries the Shopify API for product details.
             * If the product is not found, it returns a 404 error.
             * 
             * Once the product data is retrieved, it is formatted and returned in the response.
             * The response includes the user's first name, profile image, and product details such as title,
             * description, online store URL, and product image. These are then used in the Liquid template
             * to render the user landing page.
             */
            fetchProductData(favoriteProductId).then((productData) => {
                if (!productData) {
                    return res.status(404).json({ error: 'Product not found' });
                }
                const { id, title, description, onlineStoreUrl } = productData;
                res.json({
                    firstName,
                    profileImage,
                    product: {
                        id,
                        title,
                        description,
                        onlineStoreUrl,
                        image: productData.image ? {
                            id: productData.image.id,
                            alt: productData.image.alt,
                            url: productData.image.url,
                            width: productData.image.width,
                            height: productData.image.height
                        } : null
                    },
                });
            }).catch((error) => {
                console.error('Error fetching product data:', error);
        }).catch((error) => {
                console.error('Error fetching customer data:', error);
                res.status(500).json({ error: 'Failed to fetch customer data' });
            });
        });
    });
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


/**
 * Uses the Shopify GraphQL API to fetch customer data.
 * See the following link for details on the customer data API:
 * https://shopify.dev/docs/api/admin-graphql/latest/queries/customer
 * 
 * @param {string} customerId Customer ID from Shopify.
 * @returns Customer data including ID, first name, and profile image.
 */
async function fetchCustomerData(customerId) {
    try {
        const response = await client.query({
            query: `query {
                customer(id: "${customerId}") {
                    id
                    firstName
                    image {
                        src
                    }
                }
            }`,
        });
        return response.data.customer;
    } catch (error) {   
        console.error('Error fetching customer data:', error);
        throw new Error('Failed to fetch customer data');
    }
}

/**
 * Uses the Shopify GraphQL API to fetch product data.
 * See the following link for details on the product data API:
 * https://shopify.dev/docs/api/admin-graphql/latest/queries/product
 * 
 * @param {string} productId Product ID from Shopify.
 * @returns Product data including ID, title, description, online store URL, and image details.
 */
async function fetchProductData(productId) {
    try {
        const productData = Promise.resolve(client.query({
            query: `query {
                product(id: "${productId}") {
                    id
                    title
                    description
                    onlineStoreUrl
                }
            }`,
        })
        );
        const productImage = Promise.resolve(client.query({
            query: `query ProductImageList($productId: ID!) {
                product(id: $productId) {
                media(first: 1, query: "media_type:IMAGE", sortKey: POSITION) {
                    nodes {
                        id
                        alt
                        ... on MediaImage {
                                image {
                                    width
                                    height
                                    url
                                }
                            }
                        }
                    }
                }
            }`,
            "variables": {
                "productId": `${productId}`
            },
        })
        );
        Promise.all([productData, productImage]).then((responses) => {
            const product = responses[0].data.product;
            if (!product) {
                return null; // Product not found
            }
            const image = responses[1].data.product.media.nodes[0];
            if (image) {
                product.image = {
                    id: image.id,
                    alt: image.alt,
                    url: image.image.url,
                    width: image.image.width,
                    height: image.image.height
                };
            }

            return product;
        });
    } catch (error) {
        console.error('Error fetching product data:', error);
        throw new Error('Failed to fetch product data');
    }
}