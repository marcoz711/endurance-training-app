// components/LoadingSpinner.tsx
const LoadingSpinner = () => (
    <div className="flex justify-center items-center">
      <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></div>
      <style jsx>{`
        .loader {
          border-top-color: #3498db;
          animation: spinner 1s linear infinite;
        }
        @keyframes spinner {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
  
  export default LoadingSpinner;