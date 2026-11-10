import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BrandMark, Icon } from '../../components/ui';

export default function NotFound() {
  return (
    <div className="lattice relative grid min-h-[70vh] place-items-center overflow-hidden bg-[linear-gradient(125deg,#fff9f0,#f9eddd)] px-4 text-center">
      <div className="relative">
        <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="mx-auto w-fit">
          <BrandMark size={72} />
        </motion.div>
        <h1 className="heading-deva mt-6 text-5xl font-bold text-primary">४०४</h1>
        <p className="heading-deva mt-2 text-xl">वाट चुकली वाटतं!</p>
        <p className="mt-1 text-sm text-muted">Looks like this page wandered off. Let’s get you home.</p>
        <Link to="/" className="btn btn-primary mt-6">
          <Icon name="home" size={17} /> Back to home
        </Link>
      </div>
    </div>
  );
}
