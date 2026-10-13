import Icon from './Icon';

// steps: [{ label, status: 'done' | 'current' | 'todo' }]
function Stepper({ steps }) {
  return (
    <ol className="v-stepper" aria-label="Voting progress">
      {steps.map((step, index) => (
        <li key={step.label} className={`v-step v-step--${step.status}`} aria-current={step.status === 'current' ? 'step' : undefined}>
          <span className="v-step-dot">{step.status === 'done' ? <Icon name="check" /> : index + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

export default Stepper;
