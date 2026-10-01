function ReceiptCard({ receiptHash }) {
  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', marginTop: '1rem' }}>
      <strong>Receipt Hash:</strong>
      <div>{receiptHash}</div>
    </div>
  );
}

export default ReceiptCard;
