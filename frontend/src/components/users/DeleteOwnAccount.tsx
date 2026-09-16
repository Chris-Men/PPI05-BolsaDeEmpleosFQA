import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AccountActionDialog } from './AccountActionDialog';

/** Offers self-deletion from the profile while keeping protected Super Admin accounts safe. */
export function DeleteOwnAccount() {
  const { session, deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  if (!session || session.roles.includes('SUPER_ADMIN') || !session.permissions.includes('accounts.delete.own')) return null;
  return <section className="account-danger-zone" aria-label="Eliminar mi cuenta">
    <h2>Eliminar cuenta</h2>
    <p>Al eliminar tu cuenta perderás el acceso a tu perfil y a tus postulaciones.</p>
    <button type="button" className="account-action-danger" onClick={() => setConfirming(true)}>Eliminar mi cuenta</button>
    {confirming && <AccountActionDialog action="DELETE" ownAccount accountName={session.user.email}
      onConfirm={deleteAccount} onClose={() => setConfirming(false)} onSuccess={() => setConfirming(false)} />}
  </section>;
}
