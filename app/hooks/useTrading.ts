'use client';

import { useCallback } from 'react';
import { usePrivy, toViemAccount } from '@privy-io/react-auth';
import { createWalletClient, custom, encodeFunctionData } from 'viem';
import { polygon } from 'viem/chains';
import { ClobClient, Side } from '@polymarket/clob-client-v2';
import { Wallet } from 'ethers';

const USDC_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

export function useTrading() {
  const privy = usePrivy() as any;
  const wallets: any[] = privy.wallets || [];
  const wallet = wallets[0];
  const address = wallet?.address;

  const getWalletClient = useCallback(async () => {
    const provider = await wallet?.getEthereumProvider?.();
    if (!provider) throw new Error('No wallet provider');
    return createWalletClient({ chain: polygon, transport: custom(provider) });
  }, [wallet]);

  const approveUSDC = useCallback(async () => {
    const client = await getWalletClient();
    const [account] = await client.getAddresses();
    const data = encodeFunctionData({
      abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
      functionName: 'approve',
      args: [EXCHANGE, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
    });
    const tx = await (client as any).sendTransaction({ to: USDC_POLYGON, data, account });
    return tx;
  }, [getWalletClient]);

  const signOrder = useCallback(async (tokenId: string, price: number, size: number, side: 'BUY' | 'SELL') => {
    // Build order shape with the user's wallet as maker via viem account
    const viemAccount = await toViemAccount({ wallet });
    const signer = new Wallet(address);

    const client = new ClobClient({
      host: 'https://clob.polymarket.com',
      chain: 137,
      signer: signer as any,
      creds: { key: '', secret: '', passphrase: '' },
      signatureType: 1,
      funderAddress: address,
    });

    const built = await client.createOrder({
      tokenID: tokenId,
      price,
      size,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
    }) as any;

    const order = built?.order || built;

    // EIP-712 sign with the user's wallet
    const domain = {
      name: 'Polymarket CTF Exchange',
      version: '1',
      chainId: 137,
      verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
    };
    const types = {
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'signer', type: 'address' },
        { name: 'taker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'makerAmount', type: 'uint256' },
        { name: 'takerAmount', type: 'uint256' },
        { name: 'expiration', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'feeRateBps', type: 'uint256' },
        { name: 'side', type: 'uint8' },
        { name: 'signatureType', type: 'uint8' },
      ],
    };

    const typedData = {
      types: { ...types, EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ] },
      primaryType: 'Order' as const,
      domain,
      message: {
        salt: order.salt?.toString?.() || '0',
        maker: order.maker || address,
        signer: order.signer || address,
        taker: order.taker || '0x0000000000000000000000000000000000000000',
        tokenId: order.tokenId?.toString?.() || String(tokenId),
        makerAmount: order.makerAmount?.toString?.() || '0',
        takerAmount: order.takerAmount?.toString?.() || '0',
        expiration: order.expiration?.toString?.() || '0',
        nonce: order.nonce?.toString?.() || '0',
        feeRateBps: order.feeRateBps?.toString?.() || '0',
        side: order.side?.toString?.() || (side === 'BUY' ? '0' : '1'),
        signatureType: order.signatureType?.toString?.() || '0',
      },
    };

    const signature = await viemAccount.signTypedData(typedData as any);

    return {
      ...order,
      salt: order.salt?.toString?.() || '0',
      maker: order.maker || address,
      signer: order.signer || address,
      taker: order.taker || '0x0000000000000000000000000000000000000000',
      tokenId: order.tokenId?.toString?.() || String(tokenId),
      makerAmount: order.makerAmount?.toString?.() || '0',
      takerAmount: order.takerAmount?.toString?.() || '0',
      expiration: order.expiration?.toString?.() || '0',
      nonce: order.nonce?.toString?.() || '0',
      feeRateBps: order.feeRateBps?.toString?.() || '0',
      side: order.side?.toString?.() || (side === 'BUY' ? '0' : '1'),
      signatureType: order.signatureType?.toString?.() || '0',
      signature,
    };
  }, [wallet, address]);

  const placeOrder = useCallback(async (tokenId: string, price: number, size: number, side: 'BUY' | 'SELL') => {
    const signed = await signOrder(tokenId, price, size, side);
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', signedOrder: signed }),
    });
    return res.json();
  }, [signOrder]);

  return { address, approveUSDC, signOrder, placeOrder, connected: !!address };
}
