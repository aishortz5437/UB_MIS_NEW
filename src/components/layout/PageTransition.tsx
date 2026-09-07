import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
};

export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full flex-1 flex flex-col min-w-0"
        >
            {children}
        </motion.div>
    );
}
