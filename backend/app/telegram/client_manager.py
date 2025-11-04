import asyncio
import json
from typing import Dict, Optional
from pathlib import Path
from pyrogram import Client, filters
from pyrogram.types import Message
from pyrogram.errors import SessionPasswordNeeded, PhoneCodeInvalid
from app.core.config import settings
from app.core.logger import get_logger
from app.models.account import TelegramAccount, AccountStatus
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

logger = get_logger("telegram.manager")


class TelegramClientManager:
    """Manages multiple Telegram client instances"""
    
    def __init__(self):
        self.clients: Dict[int, Client] = {}
        self.pending_auth: Dict[int, Client] = {}
        Path(settings.SESSIONS_DIR).mkdir(exist_ok=True)
    
    def _get_session_path(self, account_id: int) -> str:
        """Get session file path for an account"""
        return f"{settings.SESSIONS_DIR}/account_{account_id}"
    
    async def create_client(
        self,
        account: TelegramAccount,
        db: AsyncSession
    ) -> tuple[Client, bool]:
        """
        Create and initialize a Telegram client
        Returns: (client, needs_auth)
        """
        session_path = self._get_session_path(account.id)
        
        proxy_dict = None
        if account.proxy_host and account.proxy_port:
            proxy_dict = {
                "scheme": "socks5",
                "hostname": account.proxy_host,
                "port": account.proxy_port,
            }
            if account.proxy_username:
                proxy_dict["username"] = account.proxy_username
                proxy_dict["password"] = account.proxy_password
        
        client = Client(
            name=session_path,
            api_id=int(account.api_id),
            api_hash=account.api_hash,
            phone_number=account.phone_number,
            device_model=account.device_model or "PC",
            system_version=account.system_version or "Linux",
            app_version=account.app_version or "1.0.0",
            proxy=proxy_dict,
            workdir=settings.SESSIONS_DIR
        )
        
        try:
            await client.connect()
            
            # Check if already authorized
            if await client.is_user_authorized():
                logger.info(f"Account {account.id} already authorized")
                return client, False
            
            # Start authorization process
            await client.send_code(account.phone_number)
            self.pending_auth[account.id] = client
            
            logger.info(f"Auth code sent to {account.phone_number}")
            return client, True
            
        except Exception as e:
            logger.error(f"Error creating client for account {account.id}: {e}")
            await self._update_account_status(
                db, account.id, AccountStatus.ERROR, str(e)
            )
            raise
    
    async def verify_code(
        self,
        account_id: int,
        code: str,
        two_fa_password: Optional[str],
        db: AsyncSession
    ) -> bool:
        """Verify authentication code and optionally 2FA password"""
        client = self.pending_auth.get(account_id)
        if not client:
            raise ValueError("No pending authentication for this account")
        
        try:
            await client.sign_in(
                phone_number=client.phone_number,
                phone_code=code
            )
            
            # Remove from pending and add to active clients
            self.pending_auth.pop(account_id)
            self.clients[account_id] = client
            
            await self._update_account_status(db, account_id, AccountStatus.ACTIVE)
            
            # Start monitoring
            await self._start_monitoring(account_id, db)
            
            return True
            
        except SessionPasswordNeeded:
            if not two_fa_password:
                raise ValueError("2FA password required")
            
            await client.check_password(two_fa_password)
            self.pending_auth.pop(account_id)
            self.clients[account_id] = client
            
            await self._update_account_status(db, account_id, AccountStatus.ACTIVE)
            await self._start_monitoring(account_id, db)
            
            return True
            
        except PhoneCodeInvalid:
            raise ValueError("Invalid code")
        except Exception as e:
            logger.error(f"Error verifying code for account {account_id}: {e}")
            await self._update_account_status(
                db, account_id, AccountStatus.ERROR, str(e)
            )
            raise
    
    async def _start_monitoring(self, account_id: int, db: AsyncSession):
        """Start message monitoring for an account"""
        client = self.clients.get(account_id)
        if not client:
            return
        
        # Get account settings
        result = await db.execute(
            select(TelegramAccount).where(TelegramAccount.id == account_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            return
        
        whitelist = json.loads(account.whitelist_keywords or "[]")
        blacklist = json.loads(account.blacklist_keywords or "[]")
        channels = json.loads(account.monitored_channels or "[]")
        forward_to = account.forward_to_chat_id
        
        # Create message handler
        @client.on_message(filters.chat([int(ch) for ch in channels]))
        async def handle_message(client: Client, message: Message):
            try:
                text = message.text or message.caption or ""
                text_lower = text.lower()
                
                # Check whitelist
                has_whitelist_match = any(
                    keyword.lower() in text_lower for keyword in whitelist
                ) if whitelist else True
                
                # Check blacklist
                has_blacklist_match = any(
                    keyword.lower() in text_lower for keyword in blacklist
                ) if blacklist else False
                
                if has_whitelist_match and not has_blacklist_match:
                    if forward_to:
                        await message.forward(int(forward_to))
                        logger.info(f"Message forwarded from account {account_id}")
                        
            except Exception as e:
                logger.error(f"Error handling message for account {account_id}: {e}")
        
        logger.info(f"Monitoring started for account {account_id}")
    
    async def stop_client(self, account_id: int, db: AsyncSession):
        """Stop a Telegram client"""
        client = self.clients.pop(account_id, None)
        if client:
            await client.stop()
            await self._update_account_status(db, account_id, AccountStatus.STOPPED)
            logger.info(f"Client stopped for account {account_id}")
    
    async def delete_client(self, account_id: int, db: AsyncSession):
        """Delete a Telegram client and its session"""
        await self.stop_client(account_id, db)
        
        session_path = self._get_session_path(account_id)
        session_file = Path(f"{session_path}.session")
        if session_file.exists():
            session_file.unlink()
            logger.info(f"Session file deleted for account {account_id}")
    
    async def update_client_settings(self, account_id: int, db: AsyncSession):
        """Update monitoring settings for a running client"""
        # Restart monitoring with new settings
        await self.stop_client(account_id, db)
        
        result = await db.execute(
            select(TelegramAccount).where(TelegramAccount.id == account_id)
        )
        account = result.scalar_one_or_none()
        
        if account and account.status != AccountStatus.STOPPED:
            client, needs_auth = await self.create_client(account, db)
            if not needs_auth:
                await self._start_monitoring(account_id, db)
    
    async def _update_account_status(
        self,
        db: AsyncSession,
        account_id: int,
        status: AccountStatus,
        error_message: Optional[str] = None
    ):
        """Update account status in database"""
        await db.execute(
            update(TelegramAccount)
            .where(TelegramAccount.id == account_id)
            .values(status=status, error_message=error_message)
        )
        await db.commit()


# Global instance
telegram_manager = TelegramClientManager()