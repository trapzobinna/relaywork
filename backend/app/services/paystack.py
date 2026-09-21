import hmac
import hashlib
import uuid
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

class PaystackService:
    BASE_URL = 'https://api.paystack.co'

    @staticmethod
    def is_mock_mode() -> bool:
        return settings.PAYSTACK_MOCK_MODE or not settings.PAYSTACK_SECRET_KEY or settings.PAYSTACK_SECRET_KEY.startswith('sk_test_placeholder')

    @classmethod
    async def create_subaccount(cls, business_name: str, bank_code: str, account_number: str, percentage_charge: float) -> Dict[str, Any]:
        # percentage_charge is the platform fee percentage (e.g. 15.0)
        if cls.is_mock_mode():
            mock_code = f'SUB_mock_{uuid.uuid4().hex[:8]}'
            return {
                'status': True,
                'message': 'Subaccount created (MOCK)',
                'data': {
                    'subaccount_code': mock_code,
                    'business_name': business_name,
                    'account_number': account_number,
                    'percentage_charge': percentage_charge
                }
            }

        headers = {
            'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'business_name': business_name,
            'settlement_bank': bank_code,
            'account_number': account_number,
            'percentage_charge': percentage_charge
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f'{cls.BASE_URL}/subaccount', json=payload, headers=headers)
            return resp.json()

    @classmethod
    async def initialize_transaction(cls, email: str, amount_naira: float, reference: str, subaccount_code: Optional[str] = None, callback_url: Optional[str] = None) -> Dict[str, Any]:
        # amount in kobo (1 NGN = 100 kobo)
        amount_kobo = int(round(amount_naira * 100))

        if cls.is_mock_mode():
            return {
                'status': True,
                'message': 'Authorization URL created (MOCK)',
                'data': {
                    'authorization_url': f'{settings.FRONTEND_ORIGIN}/payment/mock-checkout?reference={reference}&amount={amount_naira}',
                    'access_code': f'acc_{uuid.uuid4().hex[:10]}',
                    'reference': reference
                }
            }

        headers = {
            'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'email': email,
            'amount': amount_kobo,
            'reference': reference,
            'callback_url': callback_url or f'{settings.FRONTEND_ORIGIN}/jobs'
        }
        if subaccount_code:
            payload['subaccount'] = subaccount_code

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f'{cls.BASE_URL}/transaction/initialize', json=payload, headers=headers)
            return resp.json()

    @classmethod
    def verify_webhook_signature(cls, raw_body: bytes, signature_header: str) -> bool:
        if cls.is_mock_mode() and signature_header == 'mock_signature_test':
            return True
        if not settings.PAYSTACK_SECRET_KEY:
            return False
        computed_sig = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            raw_body,
            hashlib.sha512
        ).hexdigest()
        return hmac.compare_digest(computed_sig, signature_header)
