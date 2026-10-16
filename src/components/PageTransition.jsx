import { motion, useReducedMotion } from 'framer-motion';

// Envoltura comun para la transicion entre paginas.
export default function PageTransition({ children, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.main
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}
