import { SliderSingleBase } from '@material/mwc-slider/slider-single-base.js';
import { RippleBase } from '@material/mwc-ripple/mwc-ripple-base.js';
import { styles as sliderStyles } from '@material/mwc-slider/mwc-slider.css';
import { styles as rippleStyles } from '@material/mwc-ripple/mwc-ripple.css';

export const sliderDefinition = {
  'mwc-slider': class extends SliderSingleBase {
    static get styles() {
      return sliderStyles;
    }
  },
  'mwc-ripple': class extends RippleBase {
    static get styles() {
      return rippleStyles;
    }
  },
};
