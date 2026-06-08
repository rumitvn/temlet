import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import Confetti from 'react-confetti';

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  duration?: number;
}

export default function SuccessDialog({
  isOpen,
  onClose,
  message,
  duration = 8000, // Default 8 seconds
}: SuccessDialogProps) {
  const [progress, setProgress] = useState(100);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      // Update progress every 100ms
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      // Update window size
      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
        window.removeEventListener('resize', handleResize);
        setProgress(100); // Reset progress when dialog closes
        setShowConfetti(false);
      };
    }
  }, [isOpen, duration, onClose]);

  // Sparkle animation variants
  const sparkleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 0.5,
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {showConfetti && (
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={200}
              gravity={0.3}
              initialVelocityY={10}
              colors={['#4ade80', '#60a5fa', '#F5A623']}
            />
          )}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3, rotate: -5 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 10,
                mass: 0.8
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.5, 
              rotate: 5,
              transition: { duration: 0.2 } 
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            className="fixed bottom-4 right-4 z-50"
          >
            <div className="bg-success-bg text-success px-6 py-3 rounded-lg shadow-raised flex flex-col gap-2 relative overflow-hidden">
              {/* Sparkles */}
              <motion.div
                variants={sparkleVariants}
                initial="initial"
                animate="animate"
                className="absolute -top-2 -right-2 text-warning"
              >
                <SparklesIcon className="w-4 h-4" />
              </motion.div>
              <motion.div
                variants={sparkleVariants}
                initial="initial"
                animate="animate"
                className="absolute -bottom-2 -left-2 text-warning"
                style={{ animationDelay: '0.5s' }}
              >
                <SparklesIcon className="w-4 h-4" />
              </motion.div>

              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ 
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 600,
                      damping: 12,
                      mass: 0.5,
                      delay: 0.2
                    }
                  }}
                >
                  <CheckCircleIcon className="w-5 h-5" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: {
                      delay: 0.3,
                      duration: 0.3
                    }
                  }}
                >
                  {message}
                </motion.span>
              </div>
              <div className="h-1 w-full bg-success/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent"
                  initial={{ width: '100%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 