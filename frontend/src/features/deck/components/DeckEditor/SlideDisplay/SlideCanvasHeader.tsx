import { SlideType } from "@/features/deck/store/deckEnums.gen";
import { CephadexLogo } from "@/shared/components/Graphic/CephadexLogo";
import { SlideTypeGraphicSvg } from "../../SlideTypeGraphics/SlideTypeGraphic";
import styles from "./SlideDisplay.module.css";
const SlideCanvasHeader = ({ slideType }: { slideType: SlideType }) => {
  return (
    <div className={styles.slideHeader}>
      <CephadexLogo size={"md"} /> <SlideTypeGraphicSvg slideType={slideType} />
    </div>
  );
};

export { SlideCanvasHeader };
