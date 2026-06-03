/** Used to wrap pages that allow for scrolling vertically **/

import React, { type ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return <div> {children} </div>;
};

export { PageContainer };
