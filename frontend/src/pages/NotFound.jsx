import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="container">
      <PageHeader eyebrow="404" title="Page not found" subtitle="That address does not exist." />
      <button type="button" onClick={() => navigate('/')}>Back to the bulletin board</button>
    </div>
  );
}

export default NotFound;
