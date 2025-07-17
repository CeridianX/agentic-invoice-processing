import React from 'react';

const Navigation = () => {
  return (
    <div className="w-16 min-w-16 max-w-16 flex-shrink-0 flex flex-col bg-[linear-gradient(rgb(11,11,69)_0%,rgb(59,15,115)_52.08%,rgb(33,8,64)_100%)] text-white sticky top-0 h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center">
        <a className="flex items-center justify-center" href="/">
          <img src="/xelix_logo.svg" alt="Xelix" className="w-8 h-8" />
        </a>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center py-4 gap-6">
        {/* Invoice Processing - Active */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-700" 
          title="Invoice Processing" 
          href="/"
        >
          <svg 
            aria-hidden="true" 
            focusable="false" 
            className="h-5 w-5 text-white" 
            role="img" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 384 512"
          >
            <path 
              fill="currentColor" 
              d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM80 64l64 0c8.8 0 16 7.2 16 16s-7.2 16-16 16L80 96c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l64 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-64 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm16 96l192 0c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32L96 352c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32zm0 32l0 64 192 0 0-64L96 256zM240 416l64 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-64 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"
            />
          </svg>
        </a>

        {/* Transactions */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-700 transition-all" 
          title="Transactions" 
          href="#"
        >
          <svg 
            aria-hidden="true" 
            focusable="false" 
            className="h-5 w-5 text-white" 
            role="img" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 448 512"
          >
            <path 
              fill="currentColor" 
              d="M438.6 150.6c12.5-12.5 12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.7 96 32 96C14.3 96 0 110.3 0 128s14.3 32 32 32l306.7 0-41.4 41.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l96-96zm-333.3 352c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 416 416 416c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0 41.4-41.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-96 96c-12.5 12.5-12.5 32.8 0 45.3l96 96z"
            />
          </svg>
        </a>

        {/* Statements */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-700 transition-all" 
          title="Statements" 
          href="#"
        >
          <div className="relative">
            <svg 
              aria-hidden="true" 
              focusable="false" 
              className="h-5 w-5 text-white" 
              role="img" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 384 512"
            >
              <path 
                fill="currentColor" 
                d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z"
              />
            </svg>
            <svg 
              aria-hidden="true" 
              focusable="false" 
              className="h-3 w-3 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[20%]" 
              role="img" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 448 512"
            >
              <path 
                fill="currentColor" 
                d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"
              />
            </svg>
          </div>
        </a>

        {/* Vendors */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-700 transition-all" 
          title="Vendors" 
          href="#"
        >
          <svg 
            aria-hidden="true" 
            focusable="false" 
            className="h-5 w-5 text-white" 
            role="img" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 512 512"
          >
            <path 
              fill="currentColor" 
              d="M96 0C60.7 0 32 28.7 32 64l0 384c0 35.3 28.7 64 64 64l288 0c35.3 0 64-28.7 64-64l0-384c0-35.3-28.7-64-64-64L96 0zM208 288l64 0c44.2 0 80 35.8 80 80c0 8.8-7.2 16-16 16l-192 0c-8.8 0-16-7.2-16-16c0-44.2 35.8-80 80-80zm-32-96a64 64 0 1 1 128 0 64 64 0 1 1 -128 0zM512 80c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 64c0 8.8 7.2 16 16 16s16-7.2 16-16l0-64zM496 192c-8.8 0-16 7.2-16 16l0 64c0 8.8 7.2 16 16 16s16-7.2 16-16l0-64c0-8.8-7.2-16-16-16zm16 144c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 64c0 8.8 7.2 16 16 16s16-7.2 16-16l0-64z"
            />
          </svg>
        </a>

        {/* Reports */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-700 transition-all" 
          title="Reports" 
          href="#"
        >
          <svg 
            aria-hidden="true" 
            focusable="false" 
            className="h-5 w-5 text-white" 
            role="img" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 512 512"
          >
            <path 
              fill="currentColor" 
              d="M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64L0 400c0 44.2 35.8 80 80 80l400 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 416c-8.8 0-16-7.2-16-16L64 64zm406.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L320 210.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L240 221.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l128-128z"
            />
          </svg>
        </a>

        {/* Helpdesk */}
        <a 
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-700 transition-all" 
          title="Helpdesk" 
          href="#"
        >
          <svg 
            aria-hidden="true" 
            focusable="false" 
            className="h-5 w-5 text-white" 
            role="img" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 512 512"
          >
            <path 
              fill="currentColor" 
              d="M121 32C91.6 32 66 52 58.9 80.5L1.9 308.4C.6 313.5 0 318.7 0 323.9L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-92.1c0-5.2-.6-10.4-1.9-15.5l-57-227.9C446 52 420.4 32 391 32L121 32zm0 64l270 0 48 192-51.2 0c-12.1 0-23.2 6.8-28.6 17.7l-14.3 28.6c-5.4 10.8-16.5 17.7-28.6 17.7l-120.4 0c-12.1 0-23.2-6.8-28.6-17.7l-14.3-28.6c-5.4-10.8-16.5-17.7-28.6-17.7L73 288 121 96z"
            />
          </svg>
        </a>

        {/* Settings - At bottom */}
        <div className="mt-auto mb-12">
          <a 
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-purple-700 transition-all" 
            title="Settings" 
            href="#"
          >
            <svg 
              aria-hidden="true" 
              focusable="false" 
              className="h-5 w-5 text-white" 
              role="img" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 512 512"
            >
              <path 
                fill="currentColor" 
                d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"
              />
            </svg>
          </a>
        </div>
      </nav>
    </div>
  );
};

export default Navigation;