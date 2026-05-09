-- Migration: Add booking_disabled field to customer table
-- This field temporarily disables booking for customers with No-Show appointments
-- Run this SQL to add the booking_disabled column to your customer table

ALTER TABLE customer 
ADD COLUMN booking_disabled BOOLEAN DEFAULT FALSE;

-- Index for faster queries
CREATE INDEX idx_booking_disabled ON customer(booking_disabled);
