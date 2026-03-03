import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const PortChart = ({ open, closed }: { open: number, closed: number }) => {
  const data = {
    labels: ['Open (Vulnerable)', 'Closed (Secure)'],
    datasets: [
      {
        data: [open, closed],
        backgroundColor: ['#ef4444', '#22c55e'], // Red for Open, Green for Closed
        borderColor: ['#000', '#000'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="w-64 h-64 mx-auto">
      <Doughnut data={data} options={{ cutout: '70%', maintainAspectRatio: false }} />
    </div>
  );
};

export default PortChart;
