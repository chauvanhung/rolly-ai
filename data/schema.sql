TABLE products (
    product_id INT PRIMARY KEY,
    product_name NVARCHAR(200),
    category NVARCHAR(100),
    unit_price DECIMAL(18,2),
    stock_quantity INT,
    warehouse_location NVARCHAR(100),
    last_updated DATETIME
);

TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATETIME,
    total_amount DECIMAL(18,2),
    status NVARCHAR(50),
    created_by NVARCHAR(100)
);

TABLE order_items (
    item_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(18,2),
    discount DECIMAL(5,2)
);

TABLE customers (
    customer_id INT PRIMARY KEY,
    customer_name NVARCHAR(200),
    phone NVARCHAR(20),
    email NVARCHAR(200),
    address NVARCHAR(500),
    created_date DATETIME
);

TABLE daily_revenue (
    report_date DATE PRIMARY KEY,
    total_orders INT,
    total_revenue DECIMAL(18,2),
    total_items_sold INT
);
