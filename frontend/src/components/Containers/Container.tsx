import { type ElementType, type HTMLAttributes, type Ref } from "react";
import styles from "./Containers.module.css";

type ContainerType = "inline-size" | "size" | "normal";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  name: string;
  as?: ElementType;
  type?: ContainerType;
  ref?: Ref<HTMLElement>;
}

const Container = ({
  name,
  children,
  className,
  as: Component = "div",
  type = "inline-size",
  style,
  ref,
  ...rest
}: ContainerProps) => {
  return (
    <Component
      ref={ref}
      className={`${styles.root} ${className ?? ""}`}
      style={{
        containerName: name,
        containerType: type,
        ...style,
      }}
      {...rest}>
      {children}
    </Component>
  );
};

export { Container };
