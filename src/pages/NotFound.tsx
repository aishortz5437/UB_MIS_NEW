import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { useState } from "react";

const NotFound = () => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Floating clouds animation
  const FloatingElements = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating disconnected clouds */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          <CloudOff className="w-8 h-8 text-slate-300" />
        </motion.div>
      ))}

      {/* Pulsing gradient orbs */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          top: "10%",
          right: "-10%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)",
          bottom: "10%",
          left: "-5%",
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated dots suggesting broken connection */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.circle
          cx="30%"
          cy="50%"
          r="4"
          fill="rgba(99,102,241,0.4)"
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="4"
          fill="rgba(99,102,241,0.4)"
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.3,
          }}
        />
        <motion.circle
          cx="70%"
          cy="50%"
          r="4"
          fill="rgba(99,102,241,0.4)"
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.6,
          }}
        />

        {/* Broken line effect */}
        <motion.line
          x1="32%"
          y1="50%"
          x2="48%"
          y2="50%"
          stroke="rgba(99,102,241,0.3)"
          strokeWidth="2"
          strokeDasharray="8,8"
          animate={{
            strokeDashoffset: [0, -16],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.line
          x1="52%"
          y1="50%"
          x2="68%"
          y2="50%"
          stroke="rgba(99,102,241,0.3)"
          strokeWidth="2"
          strokeDasharray="8,8"
          animate={{
            strokeDashoffset: [0, -16],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </svg>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Animated Background */}
      <FloatingElements />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* Animated Icon Container */}
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring" as const,
            stiffness: 100,
            damping: 15,
            delay: 0.2,
          }}
        >
          {/* Pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500/20"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{ width: 120, height: 120, margin: -10 }}
          />

          {/* Icon background */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <WifiOff className="h-12 w-12 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Main Text */}
        <motion.h1
          className="mb-4 text-center text-4xl font-bold tracking-tight text-slate-800 md:text-5xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          No Internet Connection
        </motion.h1>

        <motion.p
          className="mb-8 max-w-md text-center text-lg text-slate-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          It looks like you've lost your connection. Please check your network settings and try again.
        </motion.p>

        {/* Tips Section */}
        <motion.div
          className="mb-8 max-w-sm space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-sm font-medium text-slate-700">Try these steps:</p>
          <ul className="space-y-2 text-sm text-slate-500">
            {[
              "Check your WiFi or mobile data",
              "Restart your router or modem",
              "Disable airplane mode",
              "Move closer to your router",
            ].map((tip, index) => (
              <motion.li
                key={tip}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                  {index + 1}
                </span>
                {tip}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Retry Button */}
        <motion.button
          onClick={handleRetry}
          disabled={isRetrying}
          className="group relative overflow-hidden rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-4 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-70"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />

          <span className="relative flex items-center gap-2">
            <motion.span
              animate={isRetrying ? { rotate: 360 } : {}}
              transition={{
                duration: 1,
                repeat: isRetrying ? Infinity : 0,
                ease: "linear",
              }}
            >
              <RefreshCw className="h-5 w-5" />
            </motion.span>
            {isRetrying ? "Reconnecting..." : "Try Again"}
          </span>
        </motion.button>

        {/* Status indicator */}
        <motion.div
          className="mt-8 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            className="h-2 w-2 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
          <span className="text-sm text-slate-500">Offline</span>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
