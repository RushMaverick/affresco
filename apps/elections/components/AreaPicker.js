import React from 'react';
import Select from 'react-select';
import { sortBy } from 'lodash';

import { getElectoralDistricts, getMunicipalities, getPollingDistricts } from './Backend.js';
import { AreaType } from 'election';

"use strict";

// Individual selector statuses
const NOT_SELECTED = "NOT_SELECTED";
const LOADING = "LOADING";
const DISABLED = "DISABLED";
const SELECTED = "SELECTED";

// Data constructors for all possible states of individual selector
let selector = {
  disabled: function() {
    return {
      status: DISABLED,
      selection: null,
      options: []
    }
  },
  loading: function() {
    return {
      status: LOADING,
      selection: null,
      options: []
    }
  },
  notSelected: function(options) {
    return {
      status: NOT_SELECTED,
      selection: null,
      options
    }
  },
  selected: function(selection, options) {
    return {
      status: SELECTED,
      selection,
      options
    }
  }
}

let Selector = function(props) {
  return (
    <Select
      value       = { props.state.selection }
      options     = { props.state.options }
      isDisabled  = { props.state.status == DISABLED }
      isLoading   = { props.state.status == LOADING }
      onChange    = { props.onChange }
      isClearable = { true }
      loadingMessage = { () => props.loadingMessage }
      placeholder    = { props.placeholder }
    />
  )
}

export default class AreaPicker extends React.Component {
  // called when creating the component
  constructor(props) {
    super(props);
    // initially all selectors are disabled
    this.state = {
      [AreaType.ELECTORAL_DISTRICT]: selector.disabled(),
      [AreaType.MUNICIPALITY]: selector.disabled(),
      [AreaType.POLLING_DISTRICT]: selector.disabled(),
    }
  }
  // called when component is loaded
  componentDidMount() {
    this.onUpdate(this.props.selection);
  }
  componentDidUpdate(prevProps) {
    // console.log("AreaPickerUpdate", prevProps.selection);
    // console.log("AreaPickerUpdate", this.props.selection);
    if (prevProps.selection && prevProps.selection !== this.props.selection) {
      // this.onUpdate(this.props.selection);
    }
  }
  
  onUpdate(selection) {
    console.log(selection);
    console.log("AreaPicker: ", this.props);
    if( selection && selection !== 'MAA') {
      const [e,m,p] = selection.split("-");
      console.log("emp: ", e,m,p);
      if(e) {
        this.getSelectorOptions(AreaType.ELECTORAL_DISTRICT).then(
          (areas) => {
            // console.log("Areas: ", areas);
            const e_area = areas.filter(a => (a.info.identifier === e))[0];
            if (e_area) {
              this.onSelection(AreaType.ELECTORAL_DISTRICT, areaOption(e_area));
              if(m) {
                this.getSelectorOptions(AreaType.MUNICIPALITY, e_area).then(
                  (areas) => {
                    // console.log("Areas: ", areas);
                    const m_area = areas.filter(a => (a.info.identifier === e + '-' + m))[0];
                    if (m_area){
                      this.onSelection(AreaType.MUNICIPALITY, areaOption(m_area));
                      if(p) {
                        this.getSelectorOptions(AreaType.POLLING_DISTRICT, m_area).then(
                          (areas) => {
                            // console.log("Areas: ", areas);
                            const p_area = areas.filter(a => (a.info.identifier === e + '-' + m + '-' + p))[0];
                            if (p_area)
                            this.onSelection(AreaType.POLLING_DISTRICT, areaOption(p_area));
                          }
                        );
                      }
                    }
                  }
                );
              }
            }
          }
        );
      }
    } else {
      // load top-level areas for the first selector
      this.getSelectorOptions(AreaType.ELECTORAL_DISTRICT);
    }
  }
  
  render() {
    return (
      <div className="selectors">
        <Selector
          state    = { this.state[AreaType.ELECTORAL_DISTRICT] }
          onChange = { (option) => this.onSelection(AreaType.ELECTORAL_DISTRICT, option) }
          placeholder    = "Valkrets"
          loadingMessage = "Laddar valkretser…"
        />
        <Selector
          state    = { this.state[AreaType.MUNICIPALITY] }
          onChange = { (option) => this.onSelection(AreaType.MUNICIPALITY, option) }
          placeholder    = "Kommun"
          loadingMessage = "Laddar kommuner…"
        />
        <Selector
          state    = { this.state[AreaType.POLLING_DISTRICT] }
          onChange = { (option) => this.onSelection(AreaType.POLLING_DISTRICT, option) }
          placeholder    = "Röstningsområde"
          loadingMessage = "Laddar röstningsområden…"
        />
      </div>
    )
  }
  // called whenever user updates some of the selectors
  onSelection(type, selection) {
    // means that the "clear" button was pressed and selector is reset
    if (selection === null) {
      this.onSelectorClear(type);
    } else {
      this.onSelectorSelection(type, selection);
    }
  }
  // called when user clears the selector (by pressing the 'X' button)
  onSelectorClear(type) {
    this.resetSelector(type, this.state[type].options);
    if (this.props.onSelection) {
      let parentSelection
            = type === AreaType.POLLING_DISTRICT ? this.state[AreaType.MUNICIPALITY].selection
            : type === AreaType.MUNICIPALITY     ? this.state[AreaType.ELECTORAL_DISTRICT].selection
            : type === AreaType.ELECTORAL_DISTRICT ? null
            : null
      this.props.onSelection(parentSelection);
    }
  }
  // called when the user picks a value in a selector
  onSelectorSelection(type, selection) {
    // call the props.onSelection callback
    if (this.props.onSelection) { this.props.onSelection(selection); };
    // update the state of the selected selector
    this.setState({
      [type]: selector.selected(selection, this.state[type].options),
    })
    // if there's a child we want to provide it with corresponding options
    let childType
          = type === AreaType.ELECTORAL_DISTRICT ? AreaType.MUNICIPALITY
          : type === AreaType.MUNICIPALITY       ? AreaType.POLLING_DISTRICT
          : null
    if (childType) {
      this.getSelectorOptions(childType, selection);
    }
  }
  // gets options for the specified selector which correspond to specified parent
  getSelectorOptions(type, parent) {
    // switch to loading mode
    this.setState({ [type]: selector.loading() });
    // pick the right method for fetching the corresponding areas
    let getAreas
          = type === AreaType.ELECTORAL_DISTRICT ? getElectoralDistricts()
          : type === AreaType.MUNICIPALITY       ? getMunicipalities(parent.info.identifier)
          : type === AreaType.POLLING_DISTRICT   ? getPollingDistricts(parent.info.identifier)
          : null;
    if (getAreas) {
      return getAreas.then(({ areas }) => {
        console.log(areas);
        let sortedAreas = sortBy(areas, item => item.info.identifier);
        // update selector's state and provide the fetched options
        this.resetSelector(type, sortedAreas.map(areaOption))
        return sortedAreas;
      })
    }
  }
  // resetting the selector either to an empty selection with options or to disabled state
  resetSelector(type, options) {
    // electoral district and municipality must be selected before selecting polling district
    if (type === AreaType.ELECTORAL_DISTRICT) {
      this.disableSelector(AreaType.MUNICIPALITY);
    }
    // municipality must be selected before selecting polling district
    if (type === AreaType.ELECTORAL_DISTRICT || type === AreaType.MUNICIPALITY) {
      this.disableSelector(AreaType.POLLING_DISTRICT);
    }
    // if options are provided the selector is ready to be selected
    if (options) {
      this.setState({ [type]: selector.notSelected(options) });
    } else { // otherwise we have to disable it
      this.disableSelector(type);
    }
  }
  // disables the specified selector
  disableSelector(type) {
    this.setState({ [type]: selector.disabled() });
  }
}

function areaOption(area) {
  return {
    ...area,
    value: area.info.identifier,
    label: area.info.name.swedish || area.info.name.finnish,
  }
}
