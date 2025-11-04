#!/usr/bin/env python3
"""
Скрипт для генерации безопасного SECRET_KEY
Запустите: python generate_secret_key.py
"""

import secrets

# Генерируем безопасный ключ длиной 64 символа
secret_key = secrets.token_urlsafe(48)

print("=" * 60)
print("Сгенерирован новый SECRET_KEY:")
print("=" * 60)
print(secret_key)
print("=" * 60)
print("\nСкопируйте этот ключ в ваш файл .env:")
print(f"SECRET_KEY={secret_key}")
print("=" * 60)
