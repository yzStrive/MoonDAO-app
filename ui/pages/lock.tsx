import {
  SparklesIcon,
  LockClosedIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/outline'
import { BigNumber, ethers } from 'ethers'
import { useEffect, useState } from 'react'
import React from 'react'
import {
  nationToken,
  veNationToken,
  veNationRequiredStake,
  veNationRewardsMultiplier,
} from '../lib/config'
import { useNationBalance } from '../lib/nation-token'
import { NumberType, transformNumber } from '../lib/numbers'
import { useAccount } from '../lib/use-wagmi'
import {
  useVeNationBalance,
  useVeNationLock,
  useVeNationCreateLock,
  useVeNationIncreaseLock,
  useVeNationWithdrawLock,
} from '../lib/ve-token'
import ActionButton from '../components/ActionButton'
import Balance from '../components/Balance'
import GradientLink from '../components/GradientLink'
import Head from '../components/Head'
import MainCard from '../components/MainCard'
import TimeRange from '../components/TimeRange'

const dateToReadable = (date: any) => {
  return date && date.toISOString().substring(0, 10)
}

const bigNumberToDate = (bigNumber: any) => {
  return bigNumber && new Date(bigNumber.mul(1000).toNumber())
}

const dateOut = (date: any, { days, years }: any) => {
  if (!date) return
  let dateOut = date
  days && dateOut.setDate(date.getDate() + days)
  years && dateOut.setFullYear(date.getFullYear() + years)
  return dateOut
}

const calculateVeNation = ({
  nationAmount,
  veNationAmount,
  time,
  lockTime,
  max,
}: any) => {
  if (!nationAmount) return 0

  const vestingStart = calculateVestingStart({
    nationAmount,
    veNationAmount,
    lockTime,
  })
  const percentage = (time - vestingStart) / (max - vestingStart)
  const finalVeNationAmount = nationAmount * percentage
  return finalVeNationAmount.toFixed(finalVeNationAmount > 1 ? 2 : 8)
}

const calculateVestingStart = ({
  nationAmount,
  veNationAmount,
  lockTime,
}: any) => {
  const fourYears = 31556926000 * 4
  return lockTime - (veNationAmount / nationAmount) * fourYears
}

export default function Lock() {
  const { data: account } = useAccount()

  const { data: nationBalance, isLoading: nationBalanceLoading } =
    useNationBalance(account?.address)

  const { data: veNationBalance, isLoading: veNationBalanceLoading } =
    useVeNationBalance(account?.address)

  const { data: veNationLock, isLoading: veNationLockLoading } =
    useVeNationLock(account?.address)

  const [hasLock, setHasLock] = useState<boolean>()
  useEffect(() => {
    !veNationLockLoading && setHasLock(veNationLock && veNationLock[0] != 0)
  }, [veNationLock])

  const [hasExpired, setHasExpired] = useState<boolean>()
  useEffect(() => {
    !veNationLockLoading &&
      setHasExpired(
        veNationLock &&
          veNationLock[1] != 0 &&
          ethers.BigNumber.from(+new Date()).gte(veNationLock[1].mul(1000))
      )
  }, [veNationLock])

  const [lockAmount, setLockAmount] = useState<string>()

  const oneWeekOut = dateOut(new Date(), { days: 7 })

  const [lockTime, setLockTime] = useState({
    value: ethers.BigNumber.from(+oneWeekOut),
    formatted: dateToReadable(oneWeekOut),
  } as any)

  const [minMaxLockTime, setMinMaxLockTime] = useState({} as any)

  const [canIncrease, setCanIncrease] = useState({ amount: true, time: true })
  const [wantsToIncrease, setWantsToIncrease] = useState(false)

  useEffect(() => {
    if (hasLock && veNationLock) {
      !lockAmount && setLockAmount(ethers.utils.formatEther(veNationLock[0]))
      const origTime = {
        value: veNationLock[1],
        formatted: dateToReadable(bigNumberToDate(veNationLock[1])),
      }
      !lockTime && lockTime.orig
      setLockTime({
        ...origTime,
        orig: origTime,
      })
    }
  }, [hasLock, veNationLock])

  useEffect(() => {
    if (hasLock && veNationLock) {
      setMinMaxLockTime({
        min: dateToReadable(
          oneWeekOut
        ),
        max: dateToReadable(dateOut(new Date(), { years: 4 })),
      })
      setCanIncrease({
        amount: (lockAmount &&
          ethers.utils.parseEther(lockAmount).gt(veNationLock[0])) as boolean,
        time:
          lockTime?.value &&
          lockTime.value.gt(
            +dateOut(bigNumberToDate(veNationLock[1]), { days: 7 })
          ),
      })
    } else {
      setMinMaxLockTime({
        min: dateToReadable(oneWeekOut),
        max: dateToReadable(dateOut(new Date(), { years: 4 })),
      })
    }
  }, [hasLock, lockAmount, lockTime, veNationLock])

  const createLock = useVeNationCreateLock(
    lockAmount && ethers.utils.parseEther(lockAmount),
    lockTime.value.div(1000)
  )

  const increaseLock = useVeNationIncreaseLock({
    currentAmount: veNationLock && veNationLock[0],
    newAmount:
      lockAmount &&
      veNationLock &&
      ethers.utils.parseEther(lockAmount).sub(veNationLock[0]),
    currentTime: veNationLock && veNationLock[1],
    newTime: lockTime?.value.div(1000),
  })

  const withdraw = useVeNationWithdrawLock()

  return (
    <>
      <Head title="$veMOONEY" />

      <MainCard title="Lock $MOONEY to get $veMOONEY">
        <p className="mb-4">
          $veMOONEY enables governance, and boosting
          liquidity rewards (up to {veNationRewardsMultiplier}x).{' '}
          <GradientLink
            text="Learn more"
            href="#"
            internal={false}
            textSize={'md'}
          ></GradientLink>
        </p>
        {!hasLock ? (
          <>
            <p>
              Your $veMOONEY balance is dynamic and always correlates to the
              remainder of the time lock. As time passes and the remainder of
              time lock decreases, your $veMOONEY balance decreases. If you want
              to increase it, you have to either increase the time lock or add
              more $MOONEY. $MOONEY balance stays the same.
              <br />
              <br />
          
            </p>

            {/* <ul className="list-disc list-inside mb-4">
              <li>
                At least {veNationRequiredStake as unknown as number} $NATION
                locked for 4 years, or
              </li>

              <li>
                At least {(veNationRequiredStake as unknown as number) * 2}{' '}
                $NATION locked for 2 years, or
              </li>

              <li>
                At least {(veNationRequiredStake as unknown as number) * 4}{' '}
                $NATION locked for 1 year
              </li>
            </ul> */}

            {/* <div className="alert mb-4">
              <div>
                <InformationCircleIcon className="h-24 w-24 text-n3blue" />
                <span>
                  We suggest you to obtain at least{' '}
                  {veNationRequiredStake || 0 + 0.5} $veNATION if you want to
                  mint a passport NFT, since $veNATION balance drops over time.
                  If it falls below the required threshold, your passport can be
                  revoked. You can always lock more $NATION later.
                </span>
              </div>
            </div> */}
          </>
        ) : (
          ''
        )}
        {hasLock && (
          <>
            <div className="stats stats-vertical lg:stats-horizontal shadow mb-4">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <SparklesIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Your $veNATION</div>
                <div className="stat-value text-primary">
                  <Balance
                    balance={veNationBalance.value}
                    loading={veNationBalanceLoading}
                    decimals={
                      veNationBalance &&
                      veNationBalance.value.gt(ethers.utils.parseEther('1'))
                        ? 2
                        : 8
                    }
                  />
                </div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <LockClosedIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Your locked $NATION</div>
                <div className="stat-value text-secondary">
                  <Balance
                    balance={veNationLock && veNationLock[0]}
                    loading={veNationLockLoading}
                    decimals={2}
                  />
                </div>
              </div>
            </div>

            <div className="stats stats-vertical lg:stats-horizontal shadow mb-4">
              <div className="stat">
                <div className="stat-figure">
                  <ClockIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Your lock expiration date</div>
                <div className="stat-value">
                  {veNationLock &&
                    dateToReadable(bigNumberToDate(veNationLock[1]))}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="card bg-base-100 shadow overflow-visible">
          <div className="card-body">
            <div className="form-control">
              {!hasExpired ? (
                <>
                  <p className="mb-4">
                    Available to lock:{' '}
                    <Balance
                      balance={nationBalance?.formatted}
                      loading={nationBalanceLoading}
                    />{' '}
                    $MOONEY
                  </p>
                  <label className="label">
                    <span className="label-text white-text">
                      Lock amount
                      <br />
                      <span className="text-xs ">
                        This is the final total amount. To increase it, enter
                        your current amount plus the amount you want to
                        increase.
                      </span>
                    </span>
                  </label>
                  <div className="input-group mb-4 black-text">
                    <input
                      type="number"
                      placeholder="0"
                      className="input input-bordered w-full"
                      value={lockAmount}
                      min={
                        veNationLock
                          ? ethers.utils.formatEther(veNationLock[0])
                          : 0
                      }
                      onChange={(e: any) => {
                        setLockAmount(e.target.value)
                        setWantsToIncrease(true)
                      }}
                    />

                    <button
                      className="btn btn-outline white-text"
                      onClick={() => {
                        setLockAmount(
                          veNationLock
                            ? ethers.utils.formatEther(
                                veNationLock[0].add(nationBalance?.value)
                              )
                            : nationBalance?.formatted
                        )
                        setWantsToIncrease(true)
                      }}
                    >
                      Max
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text white-text">
                      Lock expiration date
                      <br />
                      <span className="text-xs">
                        Minimum one week, maximum four years from now.
                      </span>
                    </span>
                  </label>
                  <input
                    type="date"
                    placeholder="Expiration date"
                    className="input input-bordered w-full black-text"
                    value={lockTime.formatted}
                    min={minMaxLockTime.min}
                    max={minMaxLockTime.max}
                    onChange={(e: any) => {
                      setLockTime({
                        ...lockTime,
                        formatted: e.target.value
                          ? e.target.value
                          : lockTime.orig.formatted,
                        value: e.target.value
                          ? ethers.BigNumber.from(Date.parse(e.target.value))
                          : lockTime.orig.value,
                      })
                      setWantsToIncrease(!!e.target.value)
                    }}
                  />

                  <TimeRange
                    time={Date.parse(lockTime.formatted)}
                    min={Date.parse(minMaxLockTime.min)}
                    max={Date.parse(minMaxLockTime.max)}
                    displaySteps={!hasLock}
                    onChange={(newDate: any) => {
                      setLockTime({
                        ...lockTime,
                        formatted: dateToReadable(newDate),
                        value: ethers.BigNumber.from(Date.parse(newDate)),
                      })
                      setWantsToIncrease(true)
                    }}
                  />
                  {wantsToIncrease ? (
                    <p>
                      Your final balance will be approx{' '}
                      {calculateVeNation({
                        nationAmount: lockAmount && +lockAmount,
                        veNationAmount: transformNumber(
                          veNationBalance?.value || 0,
                          NumberType.number
                        ),
                        time: Date.parse(lockTime.formatted),
                        lockTime: Date.parse(
                          hasLock && lockTime?.orig
                            ? lockTime.orig.formatted
                            : new Date()
                        ),
                        max: Date.parse(minMaxLockTime.max),
                      })}{' '}
                      $veMOONEY
                    </p>
                  ) : (
                    ''
                  )}
                  <div className="card-actions mt-4 white-text">
                    <ActionButton
                      className={`btn btn-primary normal-case font-medium w-full ${
                        !(canIncrease.amount || canIncrease.time)
                          ? 'btn-disabled'
                          : ''
                      }`}
                      action={hasLock ? increaseLock : createLock}
                      approval={{
                        token: nationToken,
                        spender: veNationToken,
                        amountNeeded:
                          hasLock && veNationLock
                            ? (
                                transformNumber(
                                  lockAmount ?? '0',
                                  NumberType.bignumber
                                ) as BigNumber
                              ).sub(veNationLock[0])
                            : transformNumber(
                                lockAmount ?? '0',
                                NumberType.bignumber
                              ),
                        approveText: 'Approve $MOONEY',
                      }}
                    >
                      {!hasLock
                        ? 'Lock'
                        : `Increase lock ${
                            canIncrease.amount ? 'amount' : ''
                          } ${
                            canIncrease.amount && canIncrease.time ? '&' : ''
                          } ${canIncrease.time ? 'time' : ''}`}
                    </ActionButton>
                  </div>
                </>
              ) : (
                <>
                  <p className='white-text'>Your previous lock has expired, you need to withdraw </p>

                  <div className="card-actions mt-4">
                    <ActionButton
                      className="btn btn-primary normal-case font-medium w-full"
                      action={withdraw}
                    >
                      Withdraw
                    </ActionButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </MainCard>
    </>
  )
}
