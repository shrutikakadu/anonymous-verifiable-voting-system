function CandidateCard({ candidate, onSelect }) {
  return (
    <button onClick={() => onSelect(candidate.id)} style={{ margin: '0.5rem', padding: '1rem', width: '200px' }}>
      {candidate.name}
    </button>
  );
}

export default CandidateCard;
