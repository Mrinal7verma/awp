-- Create database
CREATE DATABASE bankist;
USE bankist;

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner VARCHAR(100) NOT NULL,
    username VARCHAR(10) NOT NULL UNIQUE,
    pin VARCHAR(60) NOT NULL,
    interest_rate DECIMAL(4,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create movements table
CREATE TABLE movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('deposit', 'withdrawal') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert initial users
INSERT INTO users (owner, username, pin, interest_rate) VALUES
('Jonas Schmedtmann', 'js', '1111', 1.2),
('Jessica Davis', 'jd', '2222', 1.5),
('Steven Thomas Williams', 'stw', '3333', 0.7),
('Sarah Smith', 'ss', '4444', 1.0);

-- Insert initial movements
INSERT INTO movements (user_id, amount, type) VALUES
-- Jonas Schmedtmann's movements
(1, 200, 'deposit'),
(1, 450, 'deposit'),
(1, -400, 'withdrawal'),
(1, 3000, 'deposit'),
(1, -650, 'withdrawal'),
(1, -130, 'withdrawal'),
(1, 70, 'deposit'),
(1, 1300, 'deposit'),

-- Jessica Davis's movements
(2, 5000, 'deposit'),
(2, 3400, 'deposit'),
(2, -150, 'withdrawal'),
(2, -790, 'withdrawal'),
(2, -3210, 'withdrawal'),
(2, -1000, 'withdrawal'),
(2, 8500, 'deposit'),
(2, -30, 'withdrawal'),

-- Steven Thomas Williams's movements
(3, 200, 'deposit'),
(3, -200, 'withdrawal'),
(3, 340, 'deposit'),
(3, -300, 'withdrawal'),
(3, -20, 'withdrawal'),
(3, 50, 'deposit'),
(3, 400, 'deposit'),
(3, -460, 'withdrawal'),

-- Sarah Smith's movements
(4, 430, 'deposit'),
(4, 1000, 'deposit'),
(4, 700, 'deposit'),
(4, 50, 'deposit'),
(4, 90, 'deposit');