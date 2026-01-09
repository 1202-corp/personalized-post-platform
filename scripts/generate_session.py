#!/usr/bin/env python3
"""
Generate Telethon session string for user-bot.
Run this script locally and add the generated string to your .env file.

Usage:
    pip install telethon
    python scripts/generate_session.py
"""

import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession


async def main():
    print("=" * 50)
    print("Telethon Session String Generator")
    print("=" * 50)
    print()
    print("You need API ID and API Hash from https://my.telegram.org")
    print()
    
    api_id = input("Enter your API ID: ").strip()
    api_hash = input("Enter your API Hash: ").strip()
    
    try:
        api_id = int(api_id)
    except ValueError:
        print("Error: API ID must be a number")
        return
    
    print()
    print("Connecting to Telegram...")
    print("You will receive a verification code via Telegram or SMS.")
    print()
    
    async with TelegramClient(StringSession(), api_id, api_hash) as client:
        session_string = client.session.save()
        
        print()
        print("=" * 50)
        print("SUCCESS! Your session string is:")
        print("=" * 50)
        print()
        print(session_string)
        print()
        print("=" * 50)
        print()
        print("Add this to your .env file as:")
        print(f"TELEGRAM_SESSION_STRING={session_string}")
        print()
        print("IMPORTANT: Keep this string secret!")
        print("Anyone with this string can access your Telegram account.")


if __name__ == "__main__":
    asyncio.run(main())
