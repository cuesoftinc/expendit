"""Validation against the Kafka JSON Schemas owned by api/common/contract."""

from contract.validator import Contract, ContractError

__all__ = ["Contract", "ContractError"]
