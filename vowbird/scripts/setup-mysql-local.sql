-- Run this in MySQL Workbench or any MySQL client
-- when Docker is not available and you use local MySQL on Windows.

CREATE DATABASE IF NOT EXISTS vowbird
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'vowbird'@'localhost' IDENTIFIED BY 'vowbird_secret';
GRANT ALL PRIVILEGES ON vowbird.* TO 'vowbird'@'localhost';
FLUSH PRIVILEGES;

-- Your .env should use:
-- DATABASE_URL="mysql://vowbird:vowbird_secret@localhost:3306/vowbird"
