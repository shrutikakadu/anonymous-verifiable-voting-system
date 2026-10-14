import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import ReceiptSlip from '../../components/ui/ReceiptSlip';

function VoteConfirmation() {
  const navigate = useNavigate();
  const { receipt } = useAuth();

  // Direct URL access without a fresh vote goes back to the dashboard.
  if (!receipt) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow="Step 4 of 5"
        title="Vote submitted"
        subtitle="Your ballot was encrypted and stored. This is your receipt."
      />
      <ReceiptSlip receiptHash={receipt.receiptHash}>
        <button type="button" className="btn-secondary" onClick={() => navigate(`/verify-vote?receipt=${encodeURIComponent(receipt.receiptHash)}`)}>Verify now</button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/')}>Bulletin board</button>
      </ReceiptSlip>
    </div>
  );
}

export default VoteConfirmation;
