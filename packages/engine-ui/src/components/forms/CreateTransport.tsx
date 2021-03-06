import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import nameIcon from '../../assets/contact-name.svg'
import phoneIcon from '../../assets/contact-phone.svg'
import * as Elements from '../../shared-elements'
import * as FormInputs from './inputs'
import { FormState } from '../CreateTransport'
import { Form, FormikProps, useFormikContext } from 'formik'
import { validateDriverContact, validateNotEmpty } from './validation'
import { shareCurrentLocation } from '../../utils/helpers'
import * as hooks from '../../hooks'
import * as stores from '../../utils/state/stores'

const getCapacityPreset = (
  { volume, weight }: FormState['capacity'],
  transportPresets: { [s: string]: { weight: string; volume: string } }
) =>
  Object.keys(transportPresets).find(
    (p) =>
      volume === transportPresets[p].volume &&
      weight === transportPresets[p].weight
  )

const Component = ({
  dispatch,
  transportPresets,
  type,
}: {
  dispatch: any
  transportPresets: {
    [s: string]: {
      weight: string
      volume: string
    }
  }
  type: 'NEW' | 'EDIT'
}) => {
  const [loading, setLoading] = React.useState(false)
  const { values, setFieldValue, errors, touched }: FormikProps<FormState> =
    useFormikContext()
  const capacityPreset =
    getCapacityPreset(values.capacity, transportPresets) || 'custom'
  const history = useHistory()
  const [useCustomCapacity, setUseCustomCapacity] = React.useState(
    capacityPreset === 'custom'
  )
  const [showEndAddressInput, setShowEndAddressInput] = React.useState(
    !!values.endAddress
  )

  const [currentLocation, setCurrentLocation] = stores.currentLocation(
    (state) => [state, state.set]
  )

  hooks.useFormStateWithMapClickControl(
    'startAddress',
    'endAddress',
    setFieldValue
  )
  const isMobile = window.innerWidth <= 645

  const toggleShowEndAddressInput = () => {
    setShowEndAddressInput((showEndAddress) => !showEndAddress)
    setFieldValue('endAddress', { lat: undefined, lon: undefined, name: '' })
  }

  const { fleet } = useParams<{ fleet: string | undefined }>()

  React.useEffect(() => {
    if (fleet) {
      setFieldValue('metadata.fleet', fleet)
    }
  }, [fleet])

  React.useEffect(() => {
    if (currentLocation.lat || currentLocation.lon) {
      type === 'NEW' &&
        setFieldValue('startAddress', {
          ...currentLocation,
          name: `${currentLocation.name}, ${currentLocation.county}`,
          street: currentLocation.name,
        })
      setLoading(false)
    }
  }, [currentLocation])

  return (
    <Form autoComplete="off">
      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label htmlFor="drivingSchedule">
            K??rschema
          </Elements.Form.Label>
          <Elements.Layout.TimeRestrictionWrapper>
            <FormInputs.TimeRestriction.TransportTimeRestrictionPair
              handleFocus={() => dispatch({ type: 'resetInputClickState' })}
            />
          </Elements.Layout.TimeRestrictionWrapper>
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>
      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label required htmlFor="startAddress">
            Startposition
          </Elements.Form.Label>
          <FormInputs.AddressSearchInput
            id="startAddress"
            name="startAddress"
            placeholder={
              loading
                ? 'Laddar din nuvarande adress..'
                : `Adress ${isMobile ? '' : '(s??k eller klicka p?? karta)'}`
            }
            onFocusHandler={() =>
              dispatch({
                type: 'focusInput',
                payload: 'start',
              })
            }
          />
          {errors.startAddress && touched.startAddress && (
            <Elements.Typography.ErrorMessage>
              {errors.startAddress}
            </Elements.Typography.ErrorMessage>
          )}
          {!currentLocation.lon && (
            <Elements.Buttons.NeutralButton
              onClick={(e) => {
                setLoading(true)
                e.preventDefault()
                shareCurrentLocation(setCurrentLocation)
              }}
            >
              Dela din nuvarade position
            </Elements.Buttons.NeutralButton>
          )}
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>
      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <FormInputs.Checkbox
            defaultChecked={showEndAddressInput}
            label="Slutposition (om inte samma som startposition)"
            onChangeHandler={() => toggleShowEndAddressInput()}
          />

          {showEndAddressInput && values.endAddress && (
            <>
              <FormInputs.AddressSearchInput
                name="endAddress"
                placeholder={`Adress ${
                  isMobile ? '' : '(s??k eller klicka p?? karta)'
                }`}
                onFocusHandler={() =>
                  dispatch({
                    type: 'focusInput',
                    payload: 'end',
                  })
                }
              />
              {errors.endAddress && touched.endAddress && (
                <Elements.Typography.ErrorMessage>
                  {errors.endAddress}
                </Elements.Typography.ErrorMessage>
              )}
            </>
          )}
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>

      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label htmlFor="profile" required>
            Namn p?? transport
          </Elements.Form.Label>
          <FormInputs.TextInput
            id="profile"
            onFocus={() => dispatch({ type: 'resetInputClickState' })}
            validate={validateNotEmpty}
            name="metadata.profile"
            placeholder="Paketbil"
          />
          {errors.metadata?.profile && touched.metadata?.profile && (
            <Elements.Typography.ErrorMessage>
              {errors.metadata.profile}
            </Elements.Typography.ErrorMessage>
          )}
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>
      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label htmlFor="capacity" required>
            V??lj kapacitet
          </Elements.Form.Label>

          <FormInputs.TransportCapacity
            transportPresets={transportPresets}
            name="capacity"
            useCustomCapacity={useCustomCapacity}
            setUseCustomCapacity={setUseCustomCapacity}
          />
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>

      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label htmlFor="driver">Chauff??r</Elements.Form.Label>
          <Elements.Layout.InputInnerContainer>
            <Elements.Icons.FormInputIcon
              alt="Contact name icon"
              src={`${nameIcon}`}
            />
            <FormInputs.TextInput
              id="driver"
              onFocus={() => dispatch({ type: 'resetInputClickState' })}
              iconinset="true"
              name="metadata.driver.name"
              placeholder="Namn"
            />
          </Elements.Layout.InputInnerContainer>
        </Elements.Layout.InputContainer>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label required htmlFor="contact">
            Kontakt
          </Elements.Form.Label>
          <Elements.Layout.InputInnerContainer>
            <Elements.Icons.FormInputIcon
              alt="Contact number icon"
              src={`${phoneIcon}`}
            />
            <FormInputs.TextInput
              id="contact"
              iconinset="true"
              name="metadata.driver.contact"
              type="tel"
              onFocus={() => dispatch({ type: 'resetInputClickState' })}
              placeholder="Telefonnummer"
              validate={validateDriverContact}
            />
            {errors.metadata?.driver?.contact &&
              touched.metadata?.driver?.contact && (
                <Elements.Typography.ErrorMessage>
                  {errors.metadata.driver.contact}
                </Elements.Typography.ErrorMessage>
              )}
          </Elements.Layout.InputInnerContainer>
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>
      <Elements.Layout.InputBlock>
        <Elements.Layout.InputContainer>
          <Elements.Form.Label htmlFor="fleet">Flotta</Elements.Form.Label>
          <FormInputs.FleetInput
            placeholder="L??gg till eller v??lj en flotta"
            name="metadata.fleet"
          />
        </Elements.Layout.InputContainer>
      </Elements.Layout.InputBlock>
      <Elements.Layout.ButtonWrapper>
        <Elements.Buttons.CancelButton
          type="button"
          width="48.5%"
          onClick={() => history.push('/transports')}
        >
          Avbryt
        </Elements.Buttons.CancelButton>
        <Elements.Buttons.SubmitButton
          width={'48.5%'}
          padding="0.75rem 0"
          type="submit"
        >
          {type === 'NEW' ? 'L??gg till' : 'Uppdatera'}
        </Elements.Buttons.SubmitButton>
      </Elements.Layout.ButtonWrapper>
    </Form>
  )
}

export default Component
